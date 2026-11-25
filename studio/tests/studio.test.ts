import { createSchema } from 'sanity';
import { createStructureBuilder } from 'sanity/structure';
import { describe, expect, it, vi } from 'vitest';
import { AUTO_FIELD_TYPES, autoFields, documentActions, freeSlug, prepareForPublish } from '../actions';
import { schemaTypes } from '../schemaTypes';
import { NO_CONSENT_MARK } from '../schemaTypes/athlete';
import { slugifyRo, todayInBucharest } from '../schemaTypes/shared';
import { AFTER_TOURNAMENT_STEPS, START_CHOICES } from '../start/choices';
import { CREATE_MENU_TYPES, NAV, newDocumentOptions, structure } from '../structure';

type Callable = (...args: never[]) => unknown;
type AnyField = {
  name: string;
  type: string;
  title?: string;
  group?: string | string[];
  fieldset?: string;
  hidden?: boolean | Callable;
  readOnly?: boolean | Callable;
  initialValue?: unknown;
};
type AnyGroup = { name: string; title?: string; default?: boolean; hidden?: boolean };
type AnyDoc = {
  name: string;
  fields: AnyField[];
  groups?: AnyGroup[];
  fieldsets?: { name: string; description?: string }[];
  preview?: { prepare?: (value: Record<string, unknown>) => { title?: string; subtitle?: string; media?: unknown } };
};

const docs = schemaTypes as unknown as AnyDoc[];
const doc = (name: string) => docs.find((d) => d.name === name)!;
const field = (docName: string, fieldName: string) => doc(docName).fields.find((f) => f.name === fieldName)!;
const groupsOf = (f: AnyField) => (Array.isArray(f.group) ? f.group : f.group ? [f.group] : []);
const callHidden = (f: AnyField, value: unknown) => (f.hidden as (ctx: { value: unknown }) => boolean)({ value });

/** The fields a coach sees when the form opens: the default tab, minus fields hidden outright. */
const defaultVisible = (name: string) => {
  const d = doc(name);
  const main = d.groups!.find((g) => g.default)!.name;
  return d.fields.filter((f) => groupsOf(f).includes(main) && f.hidden !== true).map((f) => f.name);
};

describe('forms show only the common task', () => {
  it.each([
    ['post', ['title', 'cover', 'body', 'gallery']],
    ['athlete', ['name', 'photo', 'group', 'consent']],
    ['competition', ['title', 'start', 'end', 'city']],
    ['siteSettings', ['heroLines', 'heroText', 'heroPhoto']],
  ])('%s opens on exactly its short field list', (name, expected) => {
    expect(defaultVisible(name)).toEqual(expected);
  });

  it.each(['post', 'athlete', 'competition', 'siteSettings'])(
    '%s hides the "all fields" tab and puts every field in a tab',
    (name) => {
      const d = doc(name);
      expect(d.groups!.find((g) => g.name === 'all-fields')?.hidden).toBe(true);
      expect(d.groups!.filter((g) => g.default)).toHaveLength(1);
      const tabs = d.groups!.map((g) => g.name);
      for (const f of d.fields) {
        // With "all fields" hidden, a field without a tab could never be reached.
        expect(groupsOf(f).length, `${name}.${f.name} has no tab`).toBeGreaterThan(0);
        for (const g of groupsOf(f)) expect(tabs, `${name}.${f.name}`).toContain(g);
      }
    },
  );

  it.each([
    ['post', ['kind', 'date', 'competition', 'results', 'slug']],
    ['athlete', ['frbUrl', 'slug', 'rankings']],
    ['competition', ['home', 'post']],
  ])('%s keeps the rest under „Mai multe”', (name, expected) => {
    const d = doc(name);
    expect(d.groups!.find((g) => g.name === 'mai-multe')?.title).toBe('Mai multe');
    expect(d.fields.filter((f) => groupsOf(f).includes('mai-multe')).map((f) => f.name)).toEqual(expected);
  });

  it('splits the site texts by what the visitor sees, each tab with a hint', () => {
    const d = doc('siteSettings');
    expect(d.groups!.filter((g) => !g.hidden).map((g) => g.title)).toEqual([
      'Prima pagină',
      'De ce badminton',
      'Sala',
      'Antrenament de probă',
      'Mai multe',
    ]);
    const tabFields = (tab: string) => d.fields.filter((f) => groupsOf(f).includes(tab)).map((f) => f.name);
    expect(tabFields('de-ce')).toEqual(['whyIntro', 'whyPhoto', 'whyPoints']);
    expect(tabFields('sala')).toEqual(['hallText', 'hallPhotos']);
    expect(tabFields('proba')).toEqual(['trialText']);
    for (const f of d.fields) {
      const fieldset = d.fieldsets!.find((fs) => fs.name === f.fieldset);
      expect(fieldset?.description, `${f.name} has no hint`).toMatch(/\S/);
    }
  });

  it('pre-fills a new article with today and the kind „Competiție”', () => {
    expect(field('post', 'kind').initialValue).toBe('competitie');
    const date = field('post', 'date').initialValue as () => string;
    expect(date()).toBe(todayInBucharest());
    expect(date()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('keeps consent off by default', () => {
    expect(field('athlete', 'consent').initialValue).toBe(false);
  });

  it('hides FRB rankings while empty and keeps them read-only', () => {
    const rankings = field('athlete', 'rankings');
    expect(rankings.readOnly).toBe(true);
    expect(callHidden(rankings, undefined)).toBe(true);
    expect(callHidden(rankings, [])).toBe(true);
    expect(callHidden(rankings, [{ category: 'U17', discipline: 'SB', place: 2 }])).toBe(false);
  });

  it.each(['post', 'athlete'])('never lets a coach type the %s slug', (name) => {
    const slug = field(name, 'slug');
    expect(slug.readOnly).toBe(true);
    expect(callHidden(slug, undefined)).toBe(true);
    expect(callHidden(slug, { current: 'x' })).toBe(false);
  });

  it('derives the home flag instead of asking for it', () => {
    expect(field('competition', 'home').readOnly).toBe(true);
    expect(field('competition', 'home').initialValue).toBe(false);
  });
});

describe('publish action', () => {
  it('generates the slug from the title or name with the project rule', () => {
    expect(autoFields({ _type: 'post', title: 'Cupa României U15, București' })).toEqual({
      slug: { _type: 'slug', current: slugifyRo('Cupa României U15, București') },
    });
    expect(autoFields({ _type: 'athlete', name: 'Nistor Cristian-Ionuț' })).toEqual({
      slug: { _type: 'slug', current: 'nistor-cristian-ionut' },
    });
  });

  it('never changes an existing slug', () => {
    expect(autoFields({ _type: 'post', title: 'Titlu nou', slug: { current: 'titlul-vechi' } })).toEqual({});
    expect(autoFields({ _type: 'athlete', name: 'Alt nume', slug: { current: 'nume-vechi' } }, ['nume-vechi'])).toEqual({});
  });

  it('adds a number when another document already uses the slug', () => {
    expect(freeSlug('cupa-romaniei', [])).toBe('cupa-romaniei');
    expect(freeSlug('cupa-romaniei', ['cupa-romaniei', 'cupa-romaniei-2'])).toBe('cupa-romaniei-3');
    const long = 'a'.repeat(96);
    expect(freeSlug(long, [long])).toHaveLength(96);
  });

  it('sets the home flag from the city', () => {
    expect(autoFields({ _type: 'competition', city: 'Galați', home: false })).toEqual({ home: true });
    expect(autoFields({ _type: 'competition', city: 'galati ', home: false })).toEqual({ home: true });
    expect(autoFields({ _type: 'competition', city: 'Gala\u0163i', home: false })).toEqual({ home: true });
    expect(autoFields({ _type: 'competition', city: 'Brașov', home: true })).toEqual({ home: false });
    expect(autoFields({ _type: 'competition', city: 'Galați', home: true })).toEqual({});
  });

  it('patches the draft before publishing on the first publish', async () => {
    const takenSlugs = vi.fn(async () => ['cupa-romaniei-u15']);
    const patch = vi.fn();
    const set = await prepareForPublish({ _type: 'post', title: 'Cupa României U15' }, { takenSlugs, patch });
    expect(takenSlugs).toHaveBeenCalledWith('cupa-romaniei-u15');
    expect(patch).toHaveBeenCalledWith({ slug: { _type: 'slug', current: 'cupa-romaniei-u15-2' } });
    expect(set).toEqual({ slug: { _type: 'slug', current: 'cupa-romaniei-u15-2' } });
  });

  it('leaves a published slug alone and skips the lookup', async () => {
    const takenSlugs = vi.fn(async () => []);
    const patch = vi.fn();
    await prepareForPublish({ _type: 'post', title: 'Alt titlu', slug: { current: 'primul-titlu' } }, { takenSlugs, patch });
    expect(takenSlugs).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it('replaces the publish button and drops "duplicate" only for the coach types', () => {
    const named = (action: string) => Object.assign(() => null, { action }) as never;
    const prev = [named('publish'), named('duplicate'), named('delete')];
    const resolve = documentActions as unknown as (p: unknown[], ctx: { schemaType: string }) => { action?: string; displayName?: string }[];
    for (const type of AUTO_FIELD_TYPES) {
      const actions = resolve(prev, { schemaType: type });
      expect(actions.map((a) => a.action)).toEqual(['publish', 'delete']);
      expect(actions[0]!.displayName).toBe('AutoFieldsPublishAction');
      // Same wrapper every time: a new hook per render would reset its state.
      expect(resolve(prev, { schemaType: type })[0]).toBe(actions[0]);
    }
    expect(resolve(prev, { schemaType: 'group' })).toBe(prev);
    expect(resolve(prev, { schemaType: 'siteSettings' })).toBe(prev);
  });
});

describe('navigation', () => {
  const schema = createSchema({ name: 'test', types: schemaTypes });
  const source = {
    schema,
    templates: [],
    document: {
      singletons: [{ id: 'siteSettings', documentId: 'siteSettings', schemaType: 'siteSettings' }],
      resolveNewDocumentOptions: () => [],
    },
    i18n: { t: (key: string) => key },
    getClient: () => ({}),
    currentUser: null,
  };
  const S = createStructureBuilder({ source: source as never, perspectiveStack: [] });
  type Node = { id: string; title?: string; items?: Node[]; child?: unknown; options?: { filter?: string } };
  const root = (structure(S, {} as never) as { serialize: () => Node }).serialize();

  it('lists the coach areas in order', () => {
    expect(root.items!.map((i) => [i.id, i.title])).toEqual([
      [NAV.articles, 'Articole'],
      [NAV.calendar, 'Calendar'],
      [NAV.athletes, 'Sportivi'],
      [NAV.groups, 'Grupe și program'],
      [NAV.siteTexts, 'Textele site-ului'],
    ]);
  });

  it('shows upcoming competitions first, then past ones', () => {
    const child = root.items!.find((i) => i.id === NAV.calendar)!.child as () => { serialize: () => Node };
    const lists = child().serialize().items!.map((i) => {
      const list = i.child as Node & { options: { params: { today: string }; defaultOrdering: unknown } };
      expect(list.options.params.today).toBe(todayInBucharest());
      return [i.title, list.options.filter, list.options.defaultOrdering];
    });
    expect(lists).toEqual([
      ['Urmează', '_type == "competition" && (!defined(end) || end >= $today)', [{ field: 'start', direction: 'asc' }]],
      ['Au trecut', '_type == "competition" && end < $today', [{ field: 'start', direction: 'desc' }]],
    ]);
  });

  it('splits athletes by parental consent', () => {
    const athletes = root.items!.find((i) => i.id === NAV.athletes)!.child as Node;
    const lists = athletes.items!.map((i) => [i.id, (i.child as Node).options?.filter]);
    expect(lists).toEqual([
      ['cu-acord', '_type == "athlete" && consent == true'],
      ['fara-acord', '_type == "athlete" && consent != true'],
    ]);
  });

  it('offers only articles, competitions and athletes in the global create menu', () => {
    const templates = ['post', 'competition', 'athlete', 'group', 'siteSettings'].map((t) => ({ templateId: t }));
    const resolve = newDocumentOptions as unknown as (p: unknown[], ctx: unknown) => { templateId: string }[];
    expect(CREATE_MENU_TYPES).toEqual(['post', 'competition', 'athlete']);
    expect(resolve(templates, { creationContext: { type: 'global' } }).map((t) => t.templateId)).toEqual(CREATE_MENU_TYPES);
    expect(resolve(templates, { creationContext: { type: 'structure' } })).toHaveLength(5);
  });

  it('points every start-screen choice at a real place', () => {
    expect(START_CHOICES.map((c) => c.title)).toEqual([
      'Scrie un articol',
      'Adaugă o competiție în calendar',
      'Sportivi',
      'Program și grupe',
      'Textele de pe prima pagină',
    ]);
    expect(START_CHOICES.flatMap((c) => (c.create ? [c.create] : []))).toEqual(['post', 'competition']);
    const topLevel = root.items!.map((i) => i.id);
    for (const c of START_CHOICES.filter((choice) => choice.open)) expect(topLevel).toContain(c.open);
    expect(AFTER_TOURNAMENT_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(AFTER_TOURNAMENT_STEPS.length).toBeLessThanOrEqual(5);
  });
});

describe('list previews', () => {
  const prepare = (name: string, value: Record<string, unknown>) => doc(name).preview!.prepare!(value);

  it('shows an article with its date and kind in Romanian', () => {
    expect(prepare('post', { title: 'Cupa', date: '2026-11-14', kind: 'competitie' }).subtitle).toBe(
      '14 noiembrie 2026 · Competiție',
    );
  });

  it('shows a competition with its days, city and whether it is at home', () => {
    expect(prepare('competition', { title: 'CN', city: 'Brașov', start: '2026-11-14', end: '2026-11-16', home: false }).subtitle).toBe(
      '14–16 noiembrie 2026 · Brașov',
    );
    expect(prepare('competition', { title: 'CN', city: 'Galați', start: '2026-11-30', end: '2026-12-02', home: true }).subtitle).toBe(
      '30 noiembrie – 2 decembrie 2026 · Acasă, la Galați',
    );
    expect(prepare('competition', { title: 'CN', city: 'Iași', start: '2026-05-03', end: '2026-05-03' }).subtitle).toBe(
      '3 mai 2026 · Iași',
    );
  });

  it('marks an athlete without consent and shows the category', () => {
    expect(prepare('athlete', { title: 'Ana', consent: false, category: 'U13', group: 'Inițiere' }).subtitle).toBe(
      `${NO_CONSENT_MARK} · U13 · Inițiere`,
    );
    expect(prepare('athlete', { title: 'Ana', consent: true, category: 'U13' }).subtitle).toBe('U13');
    expect(prepare('athlete', { title: 'Ana' }).subtitle).toBe(NO_CONSENT_MARK);
  });
});
