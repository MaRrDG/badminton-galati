import { describe, expect, test } from 'vitest';
import {
  bestRanking,
  countdownLabel,
  disciplineLabel,
  groupsHeading,
  pointsUnit,
  postKindLabel,
  rosterLayout,
  rosterOrder,
  splitCalendar,
  visibleAthletes,
} from '../../src/lib/home';
import type { Athlete, Competition, Group } from '../../src/lib/types';

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

describe('visibleAthletes', () => {
  test('drops athletes without consent and keeps the rest in order', () => {
    expect(visibleAthletes([nistor, hidden, pazargic]).map(a => a.id)).toEqual(['1', '2']);
  });
});

describe('bestRanking', () => {
  test('an athlete without rankings has no best ranking', () => {
    expect(bestRanking({ ...nistor, rankings: [] })).toBeUndefined();
  });

  test('picks the ranking with the lowest place', () => {
    const multi: Athlete = {
      ...nistor,
      rankings: [
        { category: 'U17', discipline: 'DB', place: 7 },
        { category: 'U17', discipline: 'SB', place: 2, points: 168 },
        { category: 'U17', discipline: 'DX', place: 4 },
      ],
    };
    expect(bestRanking(multi)).toEqual({ category: 'U17', discipline: 'SB', place: 2, points: 168 });
  });
});

describe('rosterOrder', () => {
  test('no consent means not in the roster', () => {
    expect(rosterOrder([hidden, nistor]).map(a => a.name)).toEqual(['Nistor Cristian-Ionuț']);
  });

  test('roster order: best place first, unranked last by name', () => {
    expect(rosterOrder([bordeianu, { ...pazargic, rankings: [] }, nistor]).map(a => a.id)).toEqual(['1', '3', '2']);
  });

  test('unranked athletes sort by Romanian collation (Ș after S, before T)', () => {
    const unranked = (id: string, name: string): Athlete =>
      ({ id, name, slug: id, consent: true, rankings: [] });
    const order = rosterOrder([unranked('t', 'Tudor Ana'), unranked('ș', 'Ștefan Ioana'), unranked('s', 'Sandu Maria')]);
    expect(order.map(a => a.name)).toEqual(['Sandu Maria', 'Ștefan Ioana', 'Tudor Ana']);
  });

  test('a limit keeps only the first athletes of the order', () => {
    expect(rosterOrder([bordeianu, pazargic, nistor], 2).map(a => a.id)).toEqual(['1', '2']);
    expect(rosterOrder([bordeianu, hidden, pazargic, nistor], 3).map(a => a.id)).toEqual(['1', '2', '3']);
    expect(rosterOrder([bordeianu, pazargic, nistor]).map(a => a.id)).toEqual(['1', '2', '3']);
  });

  test('Romanian collation, not root: Szabo comes before Ștefan', () => {
    // Root collation treats Ș as a variant of S and would put Ștefan (s-t) before Szabo (s-z).
    const unranked = (id: string, name: string): Athlete =>
      ({ id, name, slug: id, consent: true, rankings: [] });
    const order = rosterOrder([unranked('ș', 'Ștefan Ioana'), unranked('sz', 'Szabo Erika')]);
    expect(order.map(a => a.name)).toEqual(['Szabo Erika', 'Ștefan Ioana']);
  });
});

const comps = [
  { id: 'a', title: 'CN U9 & CN U17', city: 'București', start: '2026-11-27', end: '2026-11-29', home: false, categories: [] },
  { id: 'b', title: 'CN U15 & CN Seniori', city: 'Blejoi/Bacău', start: '2026-11-20', end: '2026-11-22', home: false, categories: [] },
  { id: 'c', title: 'CN U11 & CN U19', city: 'Galați', start: '2026-10-23', end: '2026-10-25', home: true, categories: [] },
  { id: 'd', title: 'CN U13 & CN U23', city: 'Blejoi/Bacău', start: '2026-09-25', end: '2026-09-27', home: false, categories: [] },
  { id: 'e', title: 'CN Echipe U15', city: 'Galați', start: '2026-09-18', end: '2026-09-20', home: true, categories: [] },
] satisfies Competition[];
const cnU17 = comps[0];

describe('splitCalendar', () => {
  test('calendar splits on today', () => {
    const s = splitCalendar(comps, '2026-11-25');
    expect(s.next?.id).toBe('a');
    expect(s.played.map(c => c.id)).toEqual(['b', 'c', 'd']);
  });

  test('an event in progress is still "next"', () => {
    expect(splitCalendar(comps, '2026-11-28').next?.id).toBe('a');
  });

  test('after the season there is no next event', () => {
    const s = splitCalendar(comps, '2026-12-05');
    expect(s.next).toBeUndefined();
    expect(s.played[0].id).toBe('a');
  });

  test('input order does not matter', () => {
    const s = splitCalendar([...comps].reverse(), '2026-11-25');
    expect(s.next?.id).toBe('a');
    expect(s.played.map(c => c.id)).toEqual(['b', 'c', 'd']);
  });
});

describe('countdownLabel', () => {
  test('countdown wording', () => {
    expect(countdownLabel(cnU17, '2026-11-25')).toBe('peste 2 zile');
    expect(countdownLabel(cnU17, '2026-11-26')).toBe('începe mâine');
    expect(countdownLabel(cnU17, '2026-11-27')).toBe('începe azi');
    expect(countdownLabel(cnU17, '2026-11-28')).toBe('în desfășurare');
    expect(countdownLabel(cnU17, '2026-08-01')).toBeUndefined(); // more than 60 days away
  });

  test('the countdown shows at exactly 60 days and not at 61', () => {
    expect(countdownLabel(cnU17, '2026-09-28')).toBe('peste 60 de zile');
    expect(countdownLabel(cnU17, '2026-09-27')).toBeUndefined();
  });

  test('Romanian numerals from 20 up take "de"', () => {
    expect(countdownLabel(cnU17, '2026-11-08')).toBe('peste 19 zile');
    expect(countdownLabel(cnU17, '2026-11-07')).toBe('peste 20 de zile');
  });

  test('60 days away still counts down, and the last day is still in progress', () => {
    expect(countdownLabel(cnU17, '2026-09-28')).toBe('peste 60 de zile');
    expect(countdownLabel(cnU17, '2026-11-29')).toBe('în desfășurare');
  });

  test('a finished event has no countdown', () => {
    expect(countdownLabel(cnU17, '2026-11-30')).toBeUndefined();
  });
});

describe('disciplineLabel', () => {
  test('names every discipline in Romanian', () => {
    expect(disciplineLabel('SB')).toBe('simplu băieți');
    expect(disciplineLabel('SF')).toBe('simplu fete');
    expect(disciplineLabel('DB')).toBe('dublu băieți');
    expect(disciplineLabel('DF')).toBe('dublu fete');
    expect(disciplineLabel('DX')).toBe('dublu mixt');
  });
});

describe('postKindLabel', () => {
  test('names every post kind in Romanian', () => {
    expect(postKindLabel('competitie')).toBe('Competiție');
    expect(postKindLabel('viata-clubului')).toBe('Viața clubului');
    expect(postKindLabel('proiecte')).toBe('Proiecte');
  });
});

describe('pointsUnit', () => {
  test('one point is singular', () => {
    expect(pointsUnit(1)).toBe('punct');
  });

  test('Romanian adds "de" from 20 on, and after 00', () => {
    expect(pointsUnit(19)).toBe('puncte');
    expect(pointsUnit(20)).toBe('de puncte');
    expect(pointsUnit(168)).toBe('de puncte');
    expect(pointsUnit(101)).toBe('puncte');
    expect(pointsUnit(200)).toBe('de puncte');
  });
});

describe('groupsHeading', () => {
  const group = (i: number, track: Group['track']): Group => ({ id: `g${i}`, slug: `g${i}`, name: `G${i}`, audience: 'Toți', track, sessions: [] });
  const groups = (perf: number, amatori: number): Group[] => [
    ...Array.from({ length: perf }, (_, i) => group(i, 'performanta')),
    ...Array.from({ length: amatori }, (_, i) => group(perf + i, 'amatori')),
  ];

  test('the default five groups on both tracks read as before', () => {
    expect(groupsHeading(groups(3, 2))).toBe('Cinci grupe, pe două drumuri');
  });

  test('number words from one to ten, feminine like "grupă"', () => {
    const words = ['O grupă', 'Două grupe', 'Trei grupe', 'Patru grupe', 'Cinci grupe', 'Șase grupe',
      'Șapte grupe', 'Opt grupe', 'Nouă grupe', 'Zece grupe'];
    words.forEach((word, i) => expect(groupsHeading(groups(i + 1, 0))).toBe(word));
  });

  test('above ten the count is written in digits, with "de" from 20', () => {
    expect(groupsHeading(groups(11, 0))).toBe('11 grupe');
    expect(groupsHeading(groups(19, 0))).toBe('19 grupe');
    expect(groupsHeading(groups(20, 0))).toBe('20 de grupe');
  });

  test('"pe două drumuri" only when both tracks have groups', () => {
    expect(groupsHeading(groups(1, 1))).toBe('Două grupe, pe două drumuri');
    expect(groupsHeading(groups(0, 2))).toBe('Două grupe');
    expect(groupsHeading(groups(3, 0))).toBe('Trei grupe');
  });

  test('no groups says so instead of a count', () => {
    expect(groupsHeading([])).toBe('Nicio grupă deocamdată');
  });
});

describe('rosterLayout', () => {
  const unranked = (a: Athlete): Athlete => ({ ...a, rankings: [] });
  const shape = (athletes: Athlete[]) =>
    rosterLayout(athletes).map(b => [b.kind, b.rows.map(r => `${r.athlete.id}:${r.size}`)]);

  test('three ranked: one large row, then two sharing a row', () => {
    expect(shape([bordeianu, pazargic, nistor])).toEqual([['lead', ['1:first']], ['pair', ['2:second', '3:third']]]);
  });

  test('one ranked: the unranked athletes after it get compact rows, never the medium pair', () => {
    expect(shape([unranked(bordeianu), nistor, unranked(pazargic)]))
      .toEqual([['lead', ['1:first']], ['rest', ['3:third', '2:third']]]);
  });

  test('two ranked and one unranked: the unranked one takes the small half of the pair', () => {
    expect(shape([unranked(bordeianu), nistor, pazargic])).toEqual([['lead', ['1:first']], ['pair', ['2:second', '3:third']]]);
  });

  test('nobody ranked: rows of equal size', () => {
    expect(shape([unranked(nistor), unranked(pazargic)])).toEqual([['even-list', ['1:even', '2:even']]]);
  });

  test('shows at most three athletes, and none without consent', () => {
    const fourth = { ...bordeianu, id: '5', name: 'Zamfir Ion', rankings: [{ category: 'U11', discipline: 'SB', place: 70 }] } satisfies Athlete;
    expect(shape([fourth, hidden, bordeianu, pazargic, nistor]).flatMap(([, rows]) => rows))
      .toEqual(['1:first', '2:second', '3:third']);
  });

  test('no athletes, no rows', () => {
    expect(rosterLayout([])).toEqual([]);
  });
});
