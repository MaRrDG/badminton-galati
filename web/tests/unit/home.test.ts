import { describe, expect, test } from 'vitest';
import {
  bestRanking,
  countdownLabel,
  disciplineLabel,
  postKindLabel,
  rosterOrder,
  splitCalendar,
  visibleAthletes,
} from '../../src/lib/home';
import type { Athlete, Competition } from '../../src/lib/types';

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
});

const comps = [
  { id: 'a', title: 'CN U9 & CN U17', city: 'București', start: '2026-11-27', end: '2026-11-29', home: false },
  { id: 'b', title: 'CN U15 & CN Seniori', city: 'Blejoi/Bacău', start: '2026-11-20', end: '2026-11-22', home: false },
  { id: 'c', title: 'CN U11 & CN U19', city: 'Galați', start: '2026-10-23', end: '2026-10-25', home: true },
  { id: 'd', title: 'CN U13 & CN U23', city: 'Blejoi/Bacău', start: '2026-09-25', end: '2026-09-27', home: false },
  { id: 'e', title: 'CN Echipe U15', city: 'Galați', start: '2026-09-18', end: '2026-09-20', home: true },
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
