import { readdirSync, readFileSync, statSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { buildToday, getAthletesPage, getHomeData, getNewsPage, getSiteData, parseHomeData, parseSiteData } from '../../src/lib/content';
import { todayInBucharest } from '../../src/lib/dates';
import { HOME_QUERY, toHomeData } from '../../src/lib/sanity';
import fixture from '../../src/fixtures/home.json';

const ENV_KEYS = ['CONTENT_SOURCE', 'SANITY_PROJECT_ID', 'SANITY_DATASET', 'SANITY_READ_TOKEN', 'HOME_FIXTURE', 'BUILD_TODAY'] as const;
let savedEnv: Record<string, string | undefined>;
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

/** A Sanity image as the homepage GROQ projects it. */
const rawImg = (name: string, alt = `Poza ${name}`) => ({
  alt,
  url: `https://cdn.sanity.io/images/p/production/${name}-800x600.jpg`,
  width: 800,
  height: 600,
});

const rawAthlete = {
  _id: 'athlete-a',
  name: 'Nistor Cristian-Ionuț',
  slug: 'nistor-cristian-ionut',
  consent: true,
  frbUrl: 'https://badminton.ro/jucator/236/u17-sb-simplu-baieti/',
  photo: null,
  rankings: [{ category: 'U17', discipline: 'SB', place: 2, points: 168 }],
};

const rawSample = {
  settings: {
    heroLines: ['Ai reușit?', 'Continuă!'],
    heroText: 'Text erou',
    heroPhoto: rawImg('hero'),
    whyIntro: 'Intro',
    whyPhoto: rawImg('why'),
    whyPoints: [{ title: 'Dormi mai bine', text: 'Reduce stresul.' }],
    hallText: 'Sala',
    hallPhotos: [rawImg('hall-1'), rawImg('hall-2')],
    groupsIntro: 'Grupe',
    trialText: 'Probă',
    rankingWeek: { week: 46, from: '2026-11-09', to: '2026-11-15' },
  },
  athletes: [rawAthlete],
  groups: [{ _id: 'group-initiere', name: 'Inițiere', audience: 'Copii', track: 'performanta' }],
  competitions: [
    { _id: 'c1', title: 'CN U9 și CN U17', city: 'București', start: '2026-11-27', end: '2026-11-29', home: false },
  ],
  posts: [{ title: 'Novi Sad – 2026', slug: 'novi-sad-2026', kind: 'competitie', date: '2026-06-30', cover: rawImg('cover') }],
};

describe('fixtures', () => {
  test('fixtures satisfy HomeData', async () => {
    process.env.CONTENT_SOURCE = 'fixtures';
    const d = await getHomeData();
    expect(d.groups).toHaveLength(5); expect(d.competitions).toHaveLength(12);
    expect(d.posts.map(p => p.title)).toContain('Novi Sad – 2026');
    for (const img of [d.heroPhoto!, ...d.hallPhotos]) { expect(img.width).toBeGreaterThan(0); expect(img.alt).not.toBe(''); }
  });

  test('fixtures are the default when no Sanity project is configured', async () => {
    const d = await getHomeData();
    expect(d.heroLines).toEqual(['Ai reușit?', 'Continuă!', 'N-ai reușit?', 'Continuă!']);
  });

  test('HOME_FIXTURE naming a missing file fails with the available names', async () => {
    process.env.HOME_FIXTURE = 'nu-exista.json';
    await expect(getHomeData()).rejects.toThrow(/nu-exista\.json.*home\.json/);
  });

  test('a malformed fixture fails with the path of the bad field', () => {
    const { heroText: _drop, ...noHeroText } = fixture;
    expect(() => parseHomeData(noHeroText, 'home.json')).toThrow(/home\.json: heroText/);
    const badImg = { ...fixture, hallPhotos: [{ ...fixture.hallPhotos[0], width: 0 }] };
    expect(() => parseHomeData(badImg, 'home.json')).toThrow(/hallPhotos\[0\]\.width/);
    const badTrack = { ...fixture, groups: [{ ...fixture.groups[0], track: 'altceva' }] };
    expect(() => parseHomeData(badTrack, 'home.json')).toThrow(/groups\[0\]\.track/);
  });

  test('fixtures drop athletes without consent too', () => {
    const withHidden = { ...fixture, athletes: [...fixture.athletes, { ...fixture.athletes[0], id: 'x', slug: 'x', consent: false }] };
    expect(parseHomeData(withHidden, 'home.json').athletes).toHaveLength(fixture.athletes.length);
  });

  test('every fixture photo exists in public/ with its real pixel size', () => {
    expect(parseHomeData(fixture, 'home.json').hallPhotos).toHaveLength(7);
    const dir = new URL('../../src/fixtures/', import.meta.url);
    const names = readdirSync(dir).filter(n => n.endsWith('.json'));
    expect(names.length).toBeGreaterThan(1);
    for (const name of names) {
      const d = parseHomeData(JSON.parse(readFileSync(new URL(name, dir), 'utf8')), name);
      const imgs = [d.heroPhoto, d.whyPhoto, ...d.hallPhotos, ...d.posts.map(p => p.cover), ...d.athletes.map(a => a.photo)]
        .filter(img => img !== undefined);
      for (const img of imgs) {
        const size = jpegSize(readFileSync(new URL(`../../public${img.url}`, import.meta.url)));
        expect(size, `${name}: ${img.url}`).toEqual({ width: img.width, height: img.height });
      }
    }
  });

  test('local photos stay light: at most 1280px on the long side, under 1.6 MB together', () => {
    const dir = new URL('../../public/img/', import.meta.url);
    const files = readdirSync(dir).filter(n => n.endsWith('.jpg'));
    expect(files.length).toBeGreaterThan(0);
    let total = 0;
    for (const name of files) {
      const file = new URL(name, dir);
      const { width, height } = jpegSize(readFileSync(file));
      expect(Math.max(width, height), name).toBeLessThanOrEqual(1280);
      total += statSync(file).size;
    }
    expect(total).toBeLessThan(1.6 * 1024 * 1024);
  });

  test('the fixture holds the same facts as the Studio seed', () => {
    const seed = readFileSync(new URL('../../../studio/seed/seed.ndjson', import.meta.url), 'utf8')
      .split('\n').filter(l => l.trim() !== '').map(l => JSON.parse(l));
    const ofType = (t: string) => seed.filter((d: { _type: string }) => d._type === t);
    const settings = ofType('siteSettings')[0];
    for (const key of ['heroLines', 'heroText', 'whyIntro', 'hallText', 'groupsIntro', 'trialText', 'rankingWeek'] as const) {
      expect(fixture[key], key).toEqual(settings[key]);
    }
    expect(fixture.whyPoints).toEqual(settings.whyPoints.map(({ title, text }: { title: string; text: string }) => ({ title, text })));
    expect(fixture.groups.map(g => [g.name, g.audience, g.track]))
      .toEqual(ofType('group').sort((a: { order: number }, b: { order: number }) => a.order - b.order).map((g: { name: string; audience: string; track: string }) => [g.name, g.audience, g.track]));
    expect(fixture.competitions.map(c => [c.id, c.title, c.city, c.start, c.end, c.home]).sort())
      .toEqual(ofType('competition').map((c: Record<string, unknown>) => [c._id, c.title, c.city, c.start, c.end, c.home]).sort());
    expect(fixture.posts.map(p => [p.title, p.slug, p.kind, p.date]).sort())
      .toEqual(ofType('post').map((p: Record<string, any>) => [p.title, p.slug.current, p.kind, p.date]).sort());
    // Consent is left out: the seed holds the real state (not given yet), the fixtures show the athletes.
    expect(fixture.athletes.map(a => [a.id, a.name, a.slug, a.frbUrl, a.rankings]))
      .toEqual(ofType('athlete').map((a: Record<string, any>) => [a._id, a.name, a.slug.current, a.frbUrl,
        a.rankings.map(({ _key, _type, ...r }: Record<string, unknown>) => r)]));
  });

  test('posts come newest first and at most three, whatever the file order', () => {
    const post = (date: string) => ({ title: `Articol ${date}`, slug: `a-${date}`, kind: 'proiecte', date });
    const shuffled = ['2026-03-01', '2026-06-30', '2025-12-24', '2026-05-13', '2026-04-01'].map(post);
    const d = parseHomeData({ ...fixture, posts: shuffled }, 'home.json');
    expect(d.posts.map(p => p.date)).toEqual(['2026-06-30', '2026-05-13', '2026-04-01']);
  });

  test('competitions come by start date, whatever the file order', () => {
    const d = parseHomeData({ ...fixture, competitions: [...fixture.competitions].reverse() }, 'home.json');
    const starts = d.competitions.map(c => c.start);
    expect(starts).toEqual([...starts].sort());
    expect(d.competitions).toHaveLength(fixture.competitions.length);
  });

  test('competition titles use "și", never "&"', () => {
    for (const c of fixture.competitions) expect(c.title).not.toContain('&');
    expect(fixture.competitions.map(c => c.title)).toContain('CN U9 și CN U17');
  });
});

/** Test-only athletes on fictional names: tests never attach invented facts to real people. */
const hidden = { id: 'athlete-fara-acord-zamfira', name: 'Fără-Acord Zamfira', slug: 'fara-acord-zamfira', consent: false, rankings: [] };
const shown = { id: 'athlete-zet-exemplu-ana', name: 'Zet Exemplu-Ana', slug: 'zet-exemplu-ana', consent: true, rankings: [] };
const CR_U15_U23 = 'competition-2026-03-27-cr-u15-cr-u23';
/** A fictional article linked to a real competition of the calendar. */
const linkedPost = (slug: string, date: string) => ({ title: `Articol de test ${date}`, slug, kind: 'competitie', date, competitionId: CR_U15_U23 });

describe('site data', () => {
  test('the site keeps every post; the homepage still gets the newest three', async () => {
    process.env.CONTENT_SOURCE = 'fixtures'; process.env.HOME_FIXTURE = 'home.json';
    const site = await getSiteData();
    expect(site.posts).toHaveLength(3);
    expect(site.coaches.map(c => c.name)).toEqual(['Dorel Badiu', 'Iulian Călin', 'Adrian Panfil']);
    // Only the two photos are known; the club's answers are not yet.
    expect(site.info).toEqual({ parents: {}, contact: {}, venuePhoto: fixture.info.venuePhoto, parentsPhoto: fixture.info.parentsPhoto });
    expect(site.competitions.find(c => c.title === 'CR Echipe Seniori și Cupa U15')!.categories).toEqual(['U15', 'Seniori', 'Echipe']);
    expect((await getHomeData()).posts).toHaveLength(3);
  });

  test('the athletes page: a birth year gives a category, unknown categories come last', async () => {
    process.env.CONTENT_SOURCE = 'fixtures'; process.env.HOME_FIXTURE = 'quiet-season.json'; process.env.BUILD_TODAY = '2026-11-25';
    const page = await getAthletesPage();
    expect(page.tiles.map(t => [t.athlete.name, t.caption])).toEqual([
      ['Zet Exemplu-Ana', 'U13'], ['Bordeianu Nectarie-Ioan', undefined], ['Nistor Cristian-Ionuț', undefined], ['Pazargic Ligia-Beatrice', undefined],
    ]);
    expect(page.filters).toEqual([]);
    expect(page.rankingWeek).toBeUndefined();
    // The shared site data keeps its own order.
    expect((await getSiteData()).athletes.map(a => a.name)[0]).toBe('Nistor Cristian-Ionuț');
  });

  test('the news page holds every post; the shared site data keeps its own list', async () => {
    process.env.CONTENT_SOURCE = 'fixtures'; process.env.HOME_FIXTURE = 'quiet-season.json';
    const site = await getSiteData();
    const before = site.posts.map(p => p.slug);
    const { front, filters } = await getNewsPage();
    const shown = [front.feat!, ...front.side, ...front.rows.flat()].map(i => i.post.slug).concat(front.older.map(p => p.slug));
    expect(shown).toEqual(before);
    expect(filters[0]).toMatchObject({ label: 'Toate', count: 15 });
    expect(site.posts.map(p => p.slug)).toEqual(before);
  });

  test('new list fields default to empty lists', async () => {
    process.env.CONTENT_SOURCE = 'fixtures'; process.env.HOME_FIXTURE = 'sparse.json';
    const site = await getSiteData();
    expect(site.coaches).toEqual([]);
    expect(site.info).toEqual({ parents: {}, contact: {} });
    for (const g of site.groups) expect(g.sessions).toEqual([]);
    for (const c of site.competitions) expect(c.categories).toEqual([]);
    for (const p of site.posts) expect([p.body, p.gallery, p.results]).toEqual([[], [], []]);
  });

  test('the venue and parents photos are optional and checked like every image', () => {
    const photo = { url: '/img/sala-turneu-2.jpg', width: 1280, height: 720, alt: 'Sala' };
    for (const key of ['venuePhoto', 'parentsPhoto'] as const) {
      expect(parseSiteData({ ...fixture, info: { [key]: photo } }, 't').info[key]).toEqual(photo);
      expect(() => parseSiteData({ ...fixture, info: { [key]: { ...photo, width: 0 } } }, 't')).toThrow(`info.${key}.width`);
    }
  });

  test('groups take the seed ids and slugs; a fixture without them gets the same from the name', () => {
    const expected = [
      ['group-initiere', 'initiere'], ['group-performanta', 'performanta'], ['group-elite', 'elite'],
      ['group-amatori-copii', 'amatori-copii'], ['group-amatori-adulti', 'amatori-adulti'],
    ];
    expect(parseSiteData(fixture, 'home.json').groups.map(g => [g.id, g.slug])).toEqual(expected);
    const bare = fixture.groups.map(({ id: _id, slug: _slug, ...g }) => g);
    expect(parseSiteData({ ...fixture, groups: bare }, 't').groups.map(g => [g.id, g.slug])).toEqual(expected);
  });

  test('a tag naming an athlete without consent is dropped', () => {
    const s = parseSiteData({ ...fixture, athletes: [...fixture.athletes, hidden, shown],
      posts: [{ ...fixture.posts[0], results: [{ athleteId: hidden.id, result: 'aur' }, { athleteId: shown.id, result: 'locul 5' }] }] }, 't');
    expect(s.posts[0].results.map(r => r.athleteId)).toEqual([shown.id]);
    expect(s.athletes.map(a => a.id)).not.toContain(hidden.id);
  });

  test('the site keeps all posts, newest first', () => {
    const post = (date: string) => ({ title: `Articol ${date}`, slug: `a-${date}`, kind: 'proiecte', date });
    const s = parseSiteData({ ...fixture, posts: ['2026-03-01', '2026-06-30', '2025-12-24', '2026-05-13', '2026-04-01'].map(post) }, 't');
    expect(s.posts.map(p => p.date)).toEqual(['2026-06-30', '2026-05-13', '2026-04-01', '2026-03-01', '2025-12-24']);
  });

  test('a competition gets the slug of the newest post linked to it', () => {
    const s = parseSiteData({ ...fixture, posts: [linkedPost('mai-vechi', '2026-03-30'), linkedPost('mai-nou', '2026-04-02'), ...fixture.posts] }, 't');
    expect(s.competitions.find(c => c.id === CR_U15_U23)!.postSlug).toBe('mai-nou');
    expect(s.competitions.filter(c => c.postSlug !== undefined)).toHaveLength(1);
  });

  test('a fixture postSlug on a competition is ignored', () => {
    const competitions = fixture.competitions.map(c => (c.id === CR_U15_U23 ? { ...c, postSlug: 'x' } : c));
    const c = parseSiteData({ ...fixture, competitions }, 't').competitions.find(x => x.id === CR_U15_U23)!;
    expect(c.postSlug).toBeUndefined();
    expect(c).not.toHaveProperty('postSlug');
  });

  test('a body block of a type the site does not know is dropped, a known one is still checked', () => {
    const para = { _type: 'block', _key: 'p', children: [{ _type: 'span', _key: 's', text: 'Text' }] };
    const withBody = (body: unknown[]) => ({ ...fixture, posts: [{ ...fixture.posts[0], body }] });
    const s = parseSiteData(withBody([{ _type: 'video', _key: 'v', url: 7 }, para]), 't');
    expect(s.posts.find(p => p.slug === fixture.posts[0].slug)!.body).toEqual([para]);
    expect(() => parseSiteData(withBody([{ _type: 'photo', _key: 'f' }]), 't')).toThrow('posts[0].body[0].photo');
    expect(() => parseSiteData(withBody([{ _key: 'x' }]), 't')).toThrow('posts[0].body[0]._type');
  });

  const session = (s: object) => ({ ...fixture, groups: [{ ...fixture.groups[0], sessions: [{ day: 1, start: '17:00', end: '18:30', ...s }] }] });
  for (const [name, patch, path] of [
    ['duplicate athlete slug', { ...fixture, athletes: [{ ...shown, slug: 'a' }, { ...hidden, slug: 'a' }] }, 'athletes[1].slug'],
    ['duplicate post slug', { ...fixture, posts: [fixture.posts[0], { ...fixture.posts[1], slug: fixture.posts[0].slug }] }, 'posts[1].slug'],
    ['duplicate group slug', { ...fixture, groups: [fixture.groups[0], { ...fixture.groups[1], slug: fixture.groups[0].slug }] }, 'groups[1].slug'],
    ['unknown competitionId', { ...fixture, posts: [{ ...fixture.posts[0], competitionId: 'nope' }] }, 'posts[0].competitionId'],
    ['session ending before it starts', session({ start: '18:30', end: '17:00' }), 'groups[0].sessions[0]'],
    ['session ending when it starts', session({ start: '18:30', end: '18:30' }), 'groups[0].sessions[0]'],
    ['time written 9:00', session({ start: '9:00' }), 'groups[0].sessions[0].start'],
    ['day outside the week', session({ day: 8 }), 'groups[0].sessions[0].day'],
    ['unknown category', { ...fixture, competitions: [{ ...fixture.competitions[0], categories: ['U10'] }] }, 'competitions[0].categories[0]'],
    ['image position that is not text', { ...fixture, hallPhotos: [{ ...fixture.hallPhotos[0], position: 50 }] }, 'hallPhotos[0].position'],
  ] as const) test(`refuses ${name}`, () => expect(() => parseSiteData(patch, 't')).toThrow(path));

  // The example flags: a boolean or absent; anything else is refused with its path, so a
  // string "false" can never hatch (or un-hatch) a value by accident.
  const group = (g: object) => ({ ...fixture, groups: [{ ...fixture.groups[0], ...g }] });
  test('provisional and coachProvisional accept a boolean or nothing', () => {
    for (const flag of [true, false]) {
      expect(parseSiteData(session({ provisional: flag }), 't').groups[0].sessions[0].provisional).toBe(flag);
      expect(parseSiteData(group({ coachProvisional: flag }), 't').groups[0].coachProvisional).toBe(flag);
    }
    const { coachProvisional: _c, ...plain } = fixture.groups[0] as typeof fixture.groups[0] & { coachProvisional?: boolean };
    const absent = parseSiteData({ ...fixture, groups: [{ ...plain, sessions: [{ day: 1, start: '17:00', end: '18:30' }] }] }, 't').groups[0];
    expect(absent.sessions[0].provisional).toBeUndefined();
    expect(absent.coachProvisional).toBeUndefined();
  });
  for (const bad of ['true', 1, null] as const) {
    test(`refuses provisional: ${JSON.stringify(bad)}`, () =>
      expect(() => parseSiteData(session({ provisional: bad }), 't')).toThrow('t: groups[0].sessions[0].provisional must be true or false.'));
    test(`refuses coachProvisional: ${JSON.stringify(bad)}`, () =>
      expect(() => parseSiteData(group({ coachProvisional: bad }), 't')).toThrow('t: groups[0].coachProvisional must be true or false.'));
  }

  test('getSiteData loads once per source and again when HOME_FIXTURE changes', async () => {
    process.env.CONTENT_SOURCE = 'fixtures'; process.env.HOME_FIXTURE = 'home.json';
    const first = getSiteData();
    expect(getSiteData()).toBe(first);
    process.env.HOME_FIXTURE = 'sparse.json';
    const other = getSiteData();
    expect(other).not.toBe(first);
    expect((await first).athletes).toHaveLength(3);
    expect((await other).athletes).toEqual([]);
  });

  test('a failed load is not remembered', async () => {
    process.env.CONTENT_SOURCE = 'fixtures'; process.env.HOME_FIXTURE = 'nu-exista.json';
    const failed = getSiteData();
    await expect(failed).rejects.toThrow(/nu-exista/);
    expect(getSiteData()).not.toBe(failed);
    await expect(getSiteData()).rejects.toThrow(/nu-exista/);
  });
});

describe('Sanity source', () => {
  test('CONTENT_SOURCE=sanity without a project id names the missing variable', async () => {
    process.env.CONTENT_SOURCE = 'sanity';
    await expect(getHomeData()).rejects.toThrow(/SANITY_PROJECT_ID/);
  });

  test('CONTENT_SOURCE=sanity without a read token names the missing variable', async () => {
    process.env.CONTENT_SOURCE = 'sanity';
    process.env.SANITY_PROJECT_ID = 'p';
    await expect(getHomeData()).rejects.toThrow(/SANITY_READ_TOKEN/);
  });

  test('an unknown CONTENT_SOURCE is refused', async () => {
    process.env.CONTENT_SOURCE = 'altceva';
    await expect(getHomeData()).rejects.toThrow(/CONTENT_SOURCE/);
  });
});

describe('toHomeData', () => {
  test('the query asks Sanity for the three newest posts only', () => {
    expect(HOME_QUERY).toMatch(/\*\[_type == "post"\] \| order\(date desc\)\[0\.\.\.3\]/);
  });

  test('mapping drops athletes without consent', () => {
    const raw = { ...rawSample, athletes: [{ ...rawAthlete, consent: true }, { ...rawAthlete, _id: 'x', consent: false }, { ...rawAthlete, _id: 'y', consent: undefined /* consent missing */ }] };
    expect(toHomeData(raw).athletes).toHaveLength(1);
  });

  test('mapping tolerates empty optional data', () => {
    const d = toHomeData({ ...rawSample, athletes: [], competitions: [], posts: [], settings: { ...rawSample.settings, hallPhotos: null, rankingWeek: null } });
    expect(d.hallPhotos).toEqual([]); expect(d.rankingWeek).toBeUndefined();
  });

  test('the venue and parents photos are read when set and left out when not', () => {
    expect(HOME_QUERY).toContain('"venuePhoto": venuePhoto{');
    expect(HOME_QUERY).toContain('"parentsPhoto": parentsPhoto{');
    const set = toHomeData({ ...rawSample, settings: { ...rawSample.settings, venuePhoto: rawImg('sala'), parentsPhoto: rawImg('copii') } });
    expect(set.info).toEqual({ parents: {}, contact: {}, venuePhoto: rawImg('sala'), parentsPhoto: rawImg('copii') });
    expect(toHomeData({ ...rawSample, settings: { ...rawSample.settings, venuePhoto: null, parentsPhoto: null } }).info).toEqual({ parents: {}, contact: {} });
  });

  test('missing hero and why photos map to undefined', () => {
    const { whyPhoto: _absent, ...settings } = rawSample.settings;
    const d = toHomeData({ ...rawSample, settings: { ...settings, heroPhoto: null } });
    expect(d.heroPhoto).toBeUndefined();
    expect(d.whyPhoto).toBeUndefined();
  });

  test('images come from asset metadata; broken ones are dropped, never emptied', () => {
    const noAsset = { alt: 'Fără fișier', url: null, width: null, height: null };
    const d = toHomeData({
      ...rawSample,
      settings: { ...rawSample.settings, whyPhoto: noAsset, hallPhotos: [rawImg('ok'), noAsset, null, { ...rawImg('fara-alt'), alt: null }] },
      athletes: [{ ...rawAthlete, photo: noAsset }],
      posts: [{ ...rawSample.posts[0], cover: noAsset }],
    });
    expect(d.heroPhoto).toEqual(rawImg('hero'));
    expect(d.whyPhoto).toBeUndefined();
    expect(d.hallPhotos).toEqual([rawImg('ok')]);
    expect(d.athletes[0].photo).toBeUndefined();
    expect(d.posts[0].cover).toBeUndefined();
  });

  test('maps the full shape and leaves absent optionals out', () => {
    const d = toHomeData({
      ...rawSample,
      athletes: [{ ...rawAthlete, photo: rawImg('nistor'), rankings: null }, { ...rawAthlete, _id: 'b', frbUrl: null, rankings: [{ category: 'U15', discipline: 'SF', place: 3, points: null }] }],
    });
    expect(d.athletes[0]).toEqual({ id: 'athlete-a', name: 'Nistor Cristian-Ionuț', slug: 'nistor-cristian-ionut', consent: true, frbUrl: rawAthlete.frbUrl, photo: rawImg('nistor'), rankings: [] });
    expect(d.athletes[1]).not.toHaveProperty('frbUrl');
    expect(d.athletes[1].rankings).toEqual([{ category: 'U15', discipline: 'SF', place: 3 }]);
    expect(d.groups).toEqual([{ id: 'group-initiere', slug: 'initiere', name: 'Inițiere', audience: 'Copii', track: 'performanta', sessions: [] }]);
    expect(d.competitions[0]).toEqual({ id: 'c1', title: 'CN U9 și CN U17', city: 'București', start: '2026-11-27', end: '2026-11-29', home: false, categories: [] });
    expect(d.posts[0]).toEqual({ title: 'Novi Sad – 2026', slug: 'novi-sad-2026', kind: 'competitie', date: '2026-06-30', cover: rawImg('cover'), body: [], gallery: [], results: [] });
    expect(d.coaches).toEqual([]);
    expect(d.info).toEqual({ parents: {}, contact: {} });
    expect(d.rankingWeek).toEqual({ week: 46, from: '2026-11-09', to: '2026-11-15' });
    expect(d.whyPoints).toEqual([{ title: 'Dormi mai bine', text: 'Reduce stresul.' }]);
  });

  test('the mapped result passes the site check', () => {
    const site = parseSiteData(toHomeData(rawSample), 't');
    expect(site.groups[0]).toMatchObject({ id: 'group-initiere', slug: 'initiere' });
    expect(site.competitions[0].categories).toEqual([]);
  });

  test('group slugs follow the Studio rule', () => {
    const d = toHomeData({ ...rawSample, groups: [{ _id: 'g', name: 'Amatori adulți', audience: 'Adulți', track: 'amatori' }] });
    expect(d.groups[0].slug).toBe('amatori-adulti');
  });

  test('a result without settings fails with a readable message', () => {
    expect(() => toHomeData({ ...rawSample, settings: null })).toThrow(/siteSettings/);
  });
});

/** Reads width and height from a JPEG's start-of-frame marker. */
function jpegSize(b: Buffer): { width: number; height: number } {
  let i = 2;
  while (i + 9 < b.length) {
    const marker = b[i + 1];
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('no JPEG frame header');
}

describe('buildToday', () => {
  test('is today in Bucharest when BUILD_TODAY is not set', () => {
    expect(buildToday()).toBe(todayInBucharest());
  });

  test('BUILD_TODAY pins the date, so builds are repeatable', () => {
    process.env.BUILD_TODAY = '2026-12-05';
    expect(buildToday()).toBe('2026-12-05');
  });

  test('a malformed BUILD_TODAY fails the build', () => {
    process.env.BUILD_TODAY = '5 decembrie';
    expect(() => buildToday()).toThrow(/BUILD_TODAY/);
    process.env.BUILD_TODAY = '2026-13-05';
    expect(() => buildToday()).toThrow(/BUILD_TODAY/);
  });
});
