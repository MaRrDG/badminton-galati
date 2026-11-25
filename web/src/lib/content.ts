import { athleteProfile, athletesView, type AthleteProfile, type AthletesPage } from './athletes';
import { isIsoDate, todayInBucharest } from './dates';
import { byStart, latestPosts, newestFirst, visibleAthletes } from './home';
import { fetchHomeQuery, slugifyRo, toHomeData } from './sanity';
import {
  COMPETITION_CATEGORIES, DISCIPLINES, POST_KINDS, TRACKS, WEEKDAYS,
  type BodyBlock, type ClubInfo, type Coach, type Competition, type Group, type HomeData, type Post, type SiteData,
} from './types';

const DEFAULT_FIXTURE = 'home.json';

/** Every fixture in src/fixtures, loaded on demand; works the same under Astro and Vitest. */
const fixtures = import.meta.glob<unknown>('../fixtures/*.json', { import: 'default' });

type Source = 'fixtures' | 'sanity';

/** `CONTENT_SOURCE` wins; without it, Sanity is used only when a project id is configured. */
function contentSource(): Source {
  const value = process.env.CONTENT_SOURCE;
  if (!value) return process.env.SANITY_PROJECT_ID ? 'sanity' : 'fixtures';
  if (value === 'fixtures' || value === 'sanity') return value;
  throw new Error(`CONTENT_SOURCE must be "fixtures" or "sanity", got "${value}".`);
}

/**
 * The date the homepage is built for: today in Bucharest, or `BUILD_TODAY` (YYYY-MM-DD)
 * when set, so tests and rebuilds of a past day give the same page.
 */
export function buildToday(): string {
  const pinned = process.env.BUILD_TODAY;
  if (!pinned) return todayInBucharest();
  if (!isIsoDate(pinned)) throw new Error(`BUILD_TODAY must be a date written YYYY-MM-DD, got "${pinned}".`);
  return pinned;
}

/** Loaded site data per source (see `getSiteData`), so every page of a build shares one read and one parse. */
const loaded = new Map<string, Promise<SiteData>>();

/**
 * All site content, from Sanity or from `src/fixtures/${HOME_FIXTURE ?? 'home.json'}`, read and
 * checked once per build: the result is kept per `CONTENT_SOURCE`, `SANITY_PROJECT_ID`,
 * `SANITY_DATASET` and `HOME_FIXTURE`, so a changed variable loads again. A failed load is
 * not kept.
 */
export function getSiteData(): Promise<SiteData> {
  const env = process.env;
  const key = [env.CONTENT_SOURCE, env.SANITY_PROJECT_ID, env.SANITY_DATASET, env.HOME_FIXTURE].map(v => v ?? '').join('|');
  let site = loaded.get(key);
  if (!site) {
    const pending = loadSiteData();
    site = pending;
    loaded.set(key, pending);
    pending.catch(() => {
      if (loaded.get(key) === pending) loaded.delete(key);
    });
  }
  return site;
}

/** The homepage's content: the site data with the homepage's caps. */
export async function getHomeData(): Promise<HomeData> {
  return homeView(await getSiteData());
}

/** The athletes wall (/sportivi/), with categories counted in the build year. */
export async function getAthletesPage(): Promise<AthletesPage> {
  return athletesView(await getSiteData(), buildToday());
}

/** One profile per consented athlete (/sportivi/[slug]/); no page exists for anyone else. */
export async function getAthleteProfiles(): Promise<AthleteProfile[]> {
  const site = await getSiteData();
  const today = buildToday();
  return visibleAthletes(site.athletes).map(athlete => athleteProfile(site, athlete, today));
}

/** The homepage keeps its plan 1 keys and the newest `HOME_POSTS` posts. */
export function homeView(site: SiteData): HomeData {
  const { coaches: _coaches, info: _info, ...home } = site;
  return { ...home, posts: latestPosts(site.posts) };
}

async function loadSiteData(): Promise<SiteData> {
  if (contentSource() === 'sanity') {
    const projectId = process.env.SANITY_PROJECT_ID;
    if (!projectId) {
      throw new Error('CONTENT_SOURCE=sanity needs SANITY_PROJECT_ID, the id of the Sanity project (see web/.env.example).');
    }
    const token = process.env.SANITY_READ_TOKEN;
    if (!token) {
      throw new Error('CONTENT_SOURCE=sanity needs SANITY_READ_TOKEN, a read-only token for the private dataset (see web/.env.example).');
    }
    const dataset = process.env.SANITY_DATASET || 'production';
    const raw = await fetchHomeQuery({ projectId, dataset, token });
    return parseSiteData(toHomeData(raw), `Sanity ${projectId}/${dataset}`);
  }
  const name = process.env.HOME_FIXTURE || DEFAULT_FIXTURE;
  const load = fixtures[`../fixtures/${name}`];
  if (!load) {
    const available = Object.keys(fixtures).map(path => path.replace('../fixtures/', '')).join(', ');
    throw new Error(`HOME_FIXTURE "${name}" is not in src/fixtures. Available: ${available}.`);
  }
  return parseSiteData(await load(), name);
}

/** Plan 1 entry point, kept for its callers and tests: `homeView(parseSiteData(...))`. */
export function parseHomeData(value: unknown, source: string): HomeData {
  return homeView(parseSiteData(value, source));
}

type BlockOf<T extends BodyBlock['_type']> = Extract<BodyBlock, { _type: T }>;
const BLOCK_STYLES = ['normal', 'h2', 'h3', 'blockquote'] as const satisfies readonly NonNullable<BlockOf<'block'>['style']>[];
const LIST_ITEMS = ['bullet', 'number'] as const satisfies readonly NonNullable<BlockOf<'block'>['listItem']>[];
const PARENT_ANSWERS = ['age', 'equipment', 'cost', 'firstWeeks', 'registration'] as const satisfies readonly (keyof ClubInfo['parents'])[];
/** 24-hour time with two-digit hours: 09:00, 18:30. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Fields the source may leave out; `parseSiteData` fills them in. */
type Loose<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type CheckedSite = Omit<SiteData, 'groups' | 'competitions' | 'posts' | 'coaches' | 'info'> & {
  groups: Loose<Group, 'id' | 'slug' | 'sessions'>[];
  competitions: Loose<Competition, 'categories'>[];
  posts: Loose<Post, 'body' | 'gallery' | 'results'>[];
  coaches?: Coach[];
  info?: Partial<ClubInfo>;
};

/**
 * Checks that `value` has the shape of `SiteData`, so a malformed fixture or an incomplete
 * Sanity document fails the build with the path of the bad field. Optional fields must be
 * left out, not null; lists the inner pages added may be left out and become empty.
 * Whatever the source, returns only consented athletes and only results naming one of them,
 * competitions by start date and every post, newest first, so the order of a fixture file
 * does not matter. A competition's `postSlug` is the newest post linked to it; a `postSlug`
 * in the source is ignored. A group without `id` or `slug` gets them from its name, as the
 * seed writes them (`group-initiere`, `initiere`).
 */
export function parseSiteData(value: unknown, source: string): SiteData {
  const fail = (path: string, expected: string): never => {
    throw new Error(`${source}: ${path} must be ${expected}.`);
  };
  const record = (v: unknown, path: string): Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(path, 'an object');
  const str = (v: unknown, path: string) => {
    if (typeof v !== 'string') fail(path, 'a string');
  };
  const text = (v: unknown, path: string) => {
    if (typeof v !== 'string' || v.trim() === '') fail(path, 'a non-empty string');
  };
  const count = (v: unknown, path: string) => {
    if (!Number.isInteger(v) || (v as number) < 1) fail(path, 'a whole number of at least 1');
  };
  const year = (v: unknown, path: string) => {
    if (!Number.isInteger(v) || (v as number) < 1900 || (v as number) > 2100) fail(path, 'a year such as 2014');
  };
  const isoDate = (v: unknown, path: string) => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(path, 'a date written YYYY-MM-DD');
  };
  const time = (v: unknown, path: string) => {
    if (typeof v !== 'string' || !TIME.test(v)) fail(path, 'a time written HH:MM, 24 h (09:00, 18:30)');
  };
  const bool = (v: unknown, path: string) => {
    if (typeof v !== 'boolean') fail(path, 'true or false');
  };
  const oneOf = (options: readonly (string | number)[]) => (v: unknown, path: string) => {
    if (!options.includes(v as string | number)) fail(path, `one of ${options.join(', ')}`);
  };
  const list = (v: unknown, path: string, item: (x: unknown, p: string) => void) => {
    if (!Array.isArray(v)) fail(path, 'a list');
    (v as unknown[]).forEach((x, i) => item(x, `${path}[${i}]`));
  };
  const join = (path: string, key: string) => (path ? `${path}.${key}` : key);
  const optional = (o: Record<string, unknown>, key: string, path: string, check: (v: unknown, p: string) => void) => {
    if (o[key] !== undefined) check(o[key], join(path, key));
  };
  const optionalList = (o: Record<string, unknown>, key: string, path: string, item: (x: unknown, p: string) => void) =>
    optional(o, key, path, (v, p) => list(v, p, item));
  const fields = (o: Record<string, unknown>, path: string, checks: Record<string, (v: unknown, p: string) => void>) => {
    for (const [key, check] of Object.entries(checks)) check(o[key], join(path, key));
  };
  const unique = (items: { slug: string }[], path: string) => {
    const seen = new Set<string>();
    items.forEach((x, i) => {
      if (seen.has(x.slug)) fail(`${path}[${i}].slug`, `unique, but "${x.slug}" is used twice`);
      seen.add(x.slug);
    });
  };
  const img = (v: unknown, path: string) => {
    const o = record(v, path);
    fields(o, path, { url: text, width: count, height: count, alt: text });
    optional(o, 'position', path, text);
    optional(o, 'srcset', path, text);
  };
  const span = (v: unknown, path: string) => {
    const o = record(v, path);
    fields(o, path, { _type: oneOf(['span']), _key: text, text: str });
    optionalList(o, 'marks', path, text);
  };
  const bodyBlock = (v: unknown, path: string) => {
    const o = record(v, path);
    fields(o, path, { _type: oneOf(['block', 'photo']), _key: text });
    if (o._type === 'photo') {
      fields(o, path, { photo: img });
      return;
    }
    fields(o, path, { children: (c, cp) => list(c, cp, span) });
    optional(o, 'style', path, oneOf(BLOCK_STYLES));
    optional(o, 'listItem', path, oneOf(LIST_ITEMS));
    optional(o, 'level', path, count);
    optionalList(o, 'markDefs', path, (m, mp) => fields(record(m, mp), mp, { _key: text, _type: oneOf(['link']), href: text }));
  };
  const session = (v: unknown, path: string) => {
    const o = record(v, path);
    fields(o, path, { day: oneOf(WEEKDAYS), start: time, end: time });
    if ((o.end as string) <= (o.start as string)) fail(path, `a session that ends after it starts (${o.start}–${o.end})`);
  };

  const d = record(value, 'the content');
  fields(d, '', {
    heroLines: (v, p) => list(v, p, text),
    heroText: text,
    whyIntro: text,
    whyPoints: (v, p) => list(v, p, (x, q) => fields(record(x, q), q, { title: text, text })),
    hallText: text,
    hallPhotos: (v, p) => list(v, p, img),
    groupsIntro: text,
    trialText: text,
    athletes: (v, p) => list(v, p, (x, q) => {
      const a = record(x, q);
      fields(a, q, {
        id: text, name: text, slug: text, consent: bool,
        rankings: (r, rp) => list(r, rp, (y, yp) => {
          const ranking = record(y, yp);
          fields(ranking, yp, { category: text, discipline: oneOf(DISCIPLINES), place: count });
          optional(ranking, 'points', yp, (n, np) => { if (typeof n !== 'number') fail(np, 'a number'); });
        }),
      });
      optional(a, 'frbUrl', q, text);
      optional(a, 'photo', q, img);
      optional(a, 'birthYear', q, year);
      optional(a, 'groupId', q, text);
    }),
    competitions: (v, p) => list(v, p, (x, q) => {
      const c = record(x, q);
      fields(c, q, { id: text, title: text, city: text, start: isoDate, end: isoDate, home: bool });
      optionalList(c, 'categories', q, oneOf(COMPETITION_CATEGORIES));
      optional(c, 'resultsUrl', q, text);
    }),
    groups: (v, p) => list(v, p, (x, q) => {
      const g = record(x, q);
      fields(g, q, { name: text, audience: text, track: oneOf(TRACKS) });
      optional(g, 'id', q, text);
      optional(g, 'slug', q, text);
      optionalList(g, 'sessions', q, session);
      optional(g, 'coachId', q, text);
      optional(g, 'schedule', q, text);
    }),
    posts: (v, p) => list(v, p, (x, q) => {
      const post = record(x, q);
      fields(post, q, { title: text, slug: text, kind: oneOf(POST_KINDS), date: isoDate });
      optional(post, 'cover', q, img);
      optional(post, 'competitionId', q, text);
      optionalList(post, 'body', q, bodyBlock);
      optionalList(post, 'gallery', q, img);
      optionalList(post, 'results', q, (y, yp) => {
        const r = record(y, yp);
        fields(r, yp, { athleteId: text, result: text });
        optional(r, 'discipline', yp, oneOf(DISCIPLINES));
      });
    }),
  });
  if ((d.heroLines as unknown[]).length === 0) fail('heroLines', 'a list with at least one line');
  optional(d, 'heroPhoto', '', img);
  optional(d, 'whyPhoto', '', img);
  optional(d, 'rankingWeek', '', (v, p) => fields(record(v, p), p, { week: count, from: isoDate, to: isoDate }));
  optionalList(d, 'coaches', '', (x, q) => {
    const c = record(x, q);
    fields(c, q, { id: text, name: text });
    optional(c, 'role', q, text);
    optional(c, 'photo', q, img);
  });
  optional(d, 'info', '', (v, p) => {
    const info = record(v, p);
    optional(info, 'parents', p, (x, q) => {
      const parents = record(x, q);
      for (const key of PARENT_ANSWERS) optional(parents, key, q, text);
    });
    optional(info, 'programNote', p, text);
    optional(info, 'contact', p, (x, q) => {
      const contact = record(x, q);
      optional(contact, 'phone', q, text);
      optional(contact, 'directions', q, text);
      optional(contact, 'replyDays', q, count);
    });
  });

  const site = d as CheckedSite;
  unique(site.athletes, 'athletes');
  unique(site.posts, 'posts');
  const competitionIds = new Set(site.competitions.map(c => c.id));
  site.posts.forEach((post, i) => {
    if (post.competitionId !== undefined && !competitionIds.has(post.competitionId)) {
      fail(`posts[${i}].competitionId`, `the id of a competition, but "${post.competitionId}" names none`);
    }
  });
  const groups = site.groups.map((g): Group => {
    const slug = g.slug ?? slugifyRo(g.name);
    return { ...g, id: g.id ?? `group-${slug}`, slug, sessions: g.sessions ?? [] };
  });
  unique(groups, 'groups');

  // Consent first: everything below only ever sees visible athletes.
  const athletes = visibleAthletes(site.athletes);
  const visible = new Set(athletes.map(a => a.id));
  const posts = newestFirst(site.posts.map((p): Post => ({
    ...p,
    body: p.body ?? [],
    gallery: p.gallery ?? [],
    results: (p.results ?? []).filter(r => visible.has(r.athleteId)),
  })));
  const competitions = byStart(site.competitions.map(({ postSlug: _fromSource, ...c }): Competition => {
    const post = posts.find(p => p.competitionId === c.id); // posts are newest first
    return { ...c, categories: c.categories ?? [], ...(post ? { postSlug: post.slug } : {}) };
  }));
  return {
    ...site,
    athletes,
    competitions,
    groups,
    posts,
    coaches: site.coaches ?? [],
    info: { ...site.info, parents: site.info?.parents ?? {}, contact: site.info?.contact ?? {} },
  };
}
