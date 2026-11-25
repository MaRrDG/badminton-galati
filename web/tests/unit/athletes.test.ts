import { afterEach, describe, expect, test } from 'vitest';
import {
  athleteCategory, athleteFilters, athleteProfile, athletesCountLabel, athletesView, athleteWall, medalOf,
} from '../../src/lib/athletes';
import { getAthleteProfiles, parseSiteData } from '../../src/lib/content';
import type { Athlete, Post } from '../../src/lib/types';
import home from '../../src/fixtures/home.json';
import quiet from '../../src/fixtures/quiet-season.json';

// Plan 1's athletes (home.test.ts): the real names with their real FRB places.
const nistor = {
  id: '1', name: 'Nistor Cristian-Ionuț', slug: 'nistor-cristian-ionut', consent: true,
  rankings: [{ category: 'U17', discipline: 'SB', place: 2, points: 168 }],
} satisfies Athlete;
const pazargic = {
  id: '2', name: 'Pazargic Ligia-Beatrice', slug: 'pazargic-ligia-beatrice', consent: true,
  rankings: [{ category: 'U15', discipline: 'SF', place: 3 }],
} satisfies Athlete;
const bordeianu = {
  id: '3', name: 'Bordeianu Nectarie-Ioan', slug: 'bordeianu-nectarie-ioan', consent: true,
  rankings: [{ category: 'U13', discipline: 'DX', place: 58 }],
} satisfies Athlete;
const hidden = {
  ...nistor, id: '4', name: 'Fără Acord', consent: false,
  rankings: [{ category: 'U19', discipline: 'SB', place: 1 }],
} satisfies Athlete;
/** Test-only facts (birth years) go on fictional names. */
const fictional = (id: string, name: string, birthYear?: number): Athlete => ({
  id, name, slug: id, consent: true, rankings: [], ...(birthYear ? { birthYear } : {}),
});

describe('athleteCategory', () => {
  test('a ranked athlete takes the category of the best place', () => {
    expect(athleteCategory(nistor, 2026)).toBe('U17');
    const twoCategories: Athlete = { ...nistor, rankings: [{ category: 'U19', discipline: 'SB', place: 9 }, ...nistor.rankings] };
    expect(athleteCategory(twoCategories, 2026)).toBe('U17');
  });

  test('otherwise the category comes from the birth year', () => {
    expect(athleteCategory({ ...nistor, rankings: [], birthYear: 2015 }, 2026)).toBe('U13');
    expect(athleteCategory({ ...nistor, rankings: [], birthYear: 2016 }, 2026)).toBe('U11');
    expect(athleteCategory({ ...nistor, rankings: [], birthYear: 2005 }, 2026)).toBe('U23');
  });

  test('U-n while younger than n, U23 from 19 to 22, Seniori from 23', () => {
    const at = (age: number) => athleteCategory(fictional('x', 'Zet Exemplu-Ana', 2026 - age), 2026);
    expect([6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(at))
      .toEqual(['U9', 'U9', 'U11', 'U11', 'U13', 'U13', 'U15', 'U15', 'U17', 'U17', 'U19', 'U19']);
    expect([19, 22, 23, 40].map(at)).toEqual(['U23', 'U23', 'Seniori', 'Seniori']);
  });

  test('without a place or a birth year there is no category', () => {
    expect(athleteCategory({ ...nistor, rankings: [] }, 2026)).toBeUndefined();
  });
});

describe('athleteWall', () => {
  test('consented athletes, oldest category first, tones in turn', () => {
    const wall = athleteWall([bordeianu, hidden, pazargic, nistor], 2026);
    expect(wall.map(t => [t.athlete.name, t.caption, t.tone])).toEqual([
      ['Nistor Cristian-Ionuț', 'U17, simplu băieți', 'blue'],
      ['Pazargic Ligia-Beatrice', 'U15, simplu fete', 'deep'],
      ['Bordeianu Nectarie-Ioan', 'U13, dublu mixt', 'red'],
    ]);
    expect(wall.map(t => [t.category, t.filter, t.best?.place])).toEqual([['U17', 'u17', 2], ['U15', 'u15', 3], ['U13', 'u13', 58]]);
  });

  test('inside a category: by best place, then unranked by Romanian name; unknown category last', () => {
    const wall = athleteWall([
      fictional('a', 'Țurcanu Exemplu'),
      fictional('b', 'Zet Exemplu-Ana', 2012), // U15 by birth year
      fictional('c', 'Șerban Exemplu', 2012),
      { ...fictional('d', 'Ursu Exemplu'), rankings: [{ category: 'U15', discipline: 'SF', place: 40 }] },
      { ...fictional('e', 'Albu Exemplu'), rankings: [{ category: 'U15', discipline: 'SF', place: 7 }] },
      fictional('f', 'Sima Exemplu'),
      fictional('g', 'Matei Exemplu', 1990), // Seniori
    ], 2026);
    expect(wall.map(t => [t.athlete.id, t.caption])).toEqual([
      ['g', 'Seniori'],
      ['e', 'U15, simplu fete'], ['d', 'U15, simplu fete'], ['c', 'U15'], ['b', 'U15'],
      ['f', undefined], ['a', undefined],
    ]);
    expect(wall.map(t => t.tone)).toEqual(['blue', 'deep', 'red', 'blue', 'deep', 'red', 'blue']);
    expect(wall.at(-1)!.filter).toBe('');
  });

  test('never reorders the list it is given', () => {
    const athletes = [bordeianu, pazargic, nistor];
    athleteWall(athletes, 2026);
    expect(athletes.map(a => a.id)).toEqual(['3', '2', '1']);
  });
});

describe('athleteFilters and counts', () => {
  test('"Toți" then one option per category present, in wall order', () => {
    const wall = athleteWall([bordeianu, hidden, pazargic, nistor], 2026);
    expect(athleteFilters(wall).map(f => [f.label, f.countLabel])).toEqual([
      ['Toți', '3 sportivi'], ['U17', '1 sportiv la U17'], ['U15', '1 sportiv la U15'], ['U13', '1 sportiv la U13'],
    ]);
    expect(athleteFilters(wall).map(f => f.value)).toEqual(['toti', 'u17', 'u15', 'u13']);
  });

  test('no filter with fewer than two categories', () => {
    expect(athleteFilters(athleteWall([nistor], 2026))).toEqual([]);
    expect(athleteFilters(athleteWall([nistor, { ...nistor, id: '9', name: 'Zet Exemplu-Ana', slug: 'z' }], 2026))).toEqual([]);
    expect(athleteFilters(athleteWall([nistor, fictional('z', 'Zet Exemplu-Ana')], 2026))).toEqual([]);
    expect(athleteFilters([])).toEqual([]);
  });

  test('Romanian counts', () => {
    expect(athletesCountLabel(20)).toBe('20 de sportivi');
    expect(athletesCountLabel(3)).toBe('3 sportivi');
    expect(athletesCountLabel(1, 'U9')).toBe('1 sportiv la U9');
  });
});

describe('athletesView', () => {
  test('the page from the site data, in the build year', () => {
    const view = athletesView(parseSiteData(home, 'home.json'), '2026-11-25');
    expect(view.tiles.map(t => t.athlete.slug)).toEqual(['nistor-cristian-ionut', 'pazargic-ligia-beatrice', 'bordeianu-nectarie-ioan']);
    expect(view.filters).toHaveLength(4);
    expect(view.rankingWeek).toEqual({ week: 46, from: '2026-11-09', to: '2026-11-15' });
  });

  test('the season year comes from today', () => {
    const site = parseSiteData({ ...home, athletes: [fictional('z', 'Zet Exemplu-Ana', 2015)] }, 't');
    expect(athletesView(site, '2026-11-25').tiles[0].category).toBe('U13');
    expect(athletesView(site, '2028-01-10').tiles[0].category).toBe('U15');
  });
});

describe('medalOf', () => {
  test('a medal word, trimmed and in any case; anything else is no medal', () => {
    expect(medalOf(' Aur ')).toBe('aur');
    expect(medalOf('ARGINT')).toBe('argint');
    expect(medalOf('bronz')).toBe('bronz');
    expect(medalOf('locul 5')).toBeUndefined();
    expect(medalOf('')).toBeUndefined();
  });
});

describe('athleteProfile', () => {
  const homeSite = parseSiteData(home, 'home.json');
  const quietSite = parseSiteData(quiet, 'quiet-season.json');
  const nistorOf = (site: typeof homeSite) => site.athletes.find(a => a.slug === 'nistor-cristian-ionut')!;
  const zet = quietSite.athletes.find(a => a.slug === 'zet-exemplu-ana')!;

  test('a ranked athlete: name lines, place, its source, what is not known yet', () => {
    const p = athleteProfile(homeSite, nistorOf(homeSite), '2026-11-25');
    expect(p.nameLines).toEqual(['Nistor', 'Cristian-Ionuț']);
    expect(p.category).toBe('U17');
    expect(p.discipline).toBe('Simplu băieți');
    expect(p.best).toEqual({ category: 'U17', discipline: 'SB', place: 2, points: 168 });
    expect(p.standing).toEqual({
      place: 2, lead: 'Locul 2 în țară', rest: 'la U17, simplu băieți, cu 168 de puncte',
      source: 'Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026',
    });
    expect(p.groupName).toBeUndefined();
    expect(p.posts).toEqual([]);
    expect(p.medals).toEqual([]);
    // The same colour as the athlete's tile on the wall.
    expect(p.tone).toBe('blue');
  });

  test('without points or a ranking week, the standing says only what is known', () => {
    const pazargic = homeSite.athletes.find(a => a.slug === 'pazargic-ligia-beatrice')!;
    const { rankingWeek: _week, ...noWeek } = homeSite;
    const p = athleteProfile(noWeek, pazargic, '2026-11-25');
    expect(p.standing).toEqual({ place: 3, lead: 'Locul 3 în țară', rest: 'la U15, simplu fete' });
    expect(p.tone).toBe('deep');
  });

  test('zero points are left out, never "cu 0 de puncte"', () => {
    const nistor = nistorOf(homeSite);
    const zero = { ...nistor, rankings: [{ ...nistor.rankings[0], points: 0 }] };
    expect(athleteProfile({ ...homeSite, athletes: [zero] }, zero, '2026-11-25').standing?.rest).toBe('la U17, simplu băieți');
  });

  test('an unranked athlete: category from the birth year, the group, a medal from an article', () => {
    const z = athleteProfile(quietSite, zet, '2026-11-25');
    expect(z.nameLines).toEqual(['Zet', 'Exemplu-Ana']);
    expect(z.category).toBe('U13');
    expect(z.groupName).toBe('Inițiere');
    expect(z.best).toBeUndefined();
    expect(z.standing).toBeUndefined();
    expect(z.discipline).toBeUndefined();
    expect(z.posts.map(p => p.slug)).toEqual(['articol-de-test-cu-galerie']);
    expect(z.medals).toEqual([
      { year: 2026, rows: [{ medal: 'aur', discipline: 'SF', post: { title: 'Articol de test cu galerie', slug: 'articol-de-test-cu-galerie' } }] },
    ]);
    expect(athleteProfile(quietSite, nistorOf(quietSite), '2026-11-25').category).toBeUndefined();
  });

  test('articles newest first; medals by year, newest first, gold before silver before bronze', () => {
    const post = (slug: string, date: string, results: Post['results']): Post => ({
      title: `Titlu ${slug}`, slug, kind: 'competitie', date, body: [], gallery: [], results,
    });
    const id = zet.id;
    const site = {
      ...quietSite,
      posts: [
        post('c', '2025-05-01', [{ athleteId: id, result: 'aur' }]),
        post('a', '2026-06-01', [{ athleteId: id, discipline: 'DX', result: 'Bronz' }, { athleteId: 'other', result: 'aur' }]),
        post('none', '2026-07-01', [{ athleteId: 'other', result: 'aur' }]),
        post('b', '2026-02-01', [{ athleteId: id, discipline: 'SF', result: 'argint' }, { athleteId: id, discipline: 'DF', result: 'aur' }]),
        post('d', '2026-01-01', [{ athleteId: id, discipline: 'SF', result: 'locul 5' }]),
      ],
    };
    const before = site.posts.map(p => p.slug);
    const p = athleteProfile(site, zet, '2026-11-25');
    expect(p.posts.map(x => x.slug)).toEqual(['a', 'b', 'd', 'c']);
    expect(p.medals.map(y => [y.year, y.rows.map(r => [r.medal, r.discipline, r.post.slug])])).toEqual([
      [2026, [['aur', 'DF', 'b'], ['argint', 'SF', 'b'], ['bronz', 'DX', 'a']]],
      [2025, [['aur', undefined, 'c']]],
    ]);
    // The shared site data is never reordered.
    expect(site.posts.map(x => x.slug)).toEqual(before);
  });

  test('a one-word name keeps an empty second line', () => {
    const solo: Athlete = { id: 's', name: 'Zet', slug: 'zet', consent: true, rankings: [] };
    expect(athleteProfile({ ...quietSite, athletes: [solo] }, solo, '2026-11-25').nameLines).toEqual(['Zet', '']);
  });

  test('refuses an athlete without consent', () => {
    expect(() => athleteProfile(homeSite, { ...nistorOf(homeSite), consent: false }, '2026-11-25')).toThrow(/consent/);
  });
});

describe('getAthleteProfiles', () => {
  const saved = { CONTENT_SOURCE: process.env.CONTENT_SOURCE, HOME_FIXTURE: process.env.HOME_FIXTURE, BUILD_TODAY: process.env.BUILD_TODAY };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test('one profile per consented athlete, never one for an athlete without consent', async () => {
    process.env.CONTENT_SOURCE = 'fixtures'; process.env.BUILD_TODAY = '2026-11-25';
    process.env.HOME_FIXTURE = 'mixed-strip.json';
    expect((await getAthleteProfiles()).map(p => p.athlete.slug))
      .toEqual(['nistor-cristian-ionut', 'pazargic-ligia-beatrice', 'bordeianu-nectarie-ioan']);
    process.env.HOME_FIXTURE = 'sparse.json';
    expect(await getAthleteProfiles()).toEqual([]);
  });
});
