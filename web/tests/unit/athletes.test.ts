import { describe, expect, test } from 'vitest';
import { athleteCategory, athleteFilters, athletesCountLabel, athletesView, athleteWall } from '../../src/lib/athletes';
import { parseSiteData } from '../../src/lib/content';
import type { Athlete } from '../../src/lib/types';
import home from '../../src/fixtures/home.json';

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
