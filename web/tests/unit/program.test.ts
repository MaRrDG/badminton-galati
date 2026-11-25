import { describe, expect, test } from 'vitest';
import { parseSiteData } from '../../src/lib/content';
import { groupTone, plannerRows, programView, scheduleLabel, weekPlanner } from '../../src/lib/program';
import type { Group, Session } from '../../src/lib/types';
import home from '../../src/fixtures/home.json';
import quiet from '../../src/fixtures/quiet-season.json';

const site = parseSiteData(quiet, 'quiet-season.json');
const homeSite = parseSiteData(home, 'home.json');
const sampleGroups = site.groups;
const homeGroups = homeSite.groups;
const [initiere, performanta] = sampleGroups;
const group = (slug: string, sessions: Session[], extra: Partial<Group> = {}): Group =>
  ({ id: `group-${slug}`, slug, name: slug, audience: 'x', track: 'amatori', sessions, ...extra });

describe('weekPlanner', () => {
  test('the sample week: days, hour marks, the compressed afternoon and the blocks', () => {
    const p = weekPlanner(sampleGroups)!;
    expect(p.days.map(d => d.name)).toEqual(['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']);
    expect(p.days.map(d => d.col)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(p.marks).toEqual([['10:00', 2], ['11:00', 4], ['12:00', 6], ['13:00', 8], ['14:00', 10], ['17:00', 11], ['18:00', 13],
      ['19:00', 15], ['20:00', 17], ['21:00', 19], ['22:00', 21]].map(([label, row]) => ({ label, row })));
    expect(p.gapRows).toEqual([10]);
    const at = (name: string, day: number) => p.blocks.find(b => b.group.name === name && b.day === day)!;
    expect([at('Performanță', 6).r1, at('Performanță', 6).r2, at('Elite', 6).r1, at('Elite', 6).r2]).toEqual([2, 6, 6, 10]);
    expect([at('Inițiere', 1).r1, at('Inițiere', 1).r2, at('Amatori adulți', 2).r1, at('Amatori adulți', 2).r2]).toEqual([11, 14, 18, 21]);
    expect(at('Elite', 6)).toMatchObject({ col: 7, tone: 'deep', label: '12:00–14:00', lane: 0, lanes: 1 });
    expect(p.blocks).toHaveLength(14);
  });

  test('no sessions, no planner', () => {
    expect(weekPlanner(homeGroups)).toBeUndefined();
    expect(weekPlanner([])).toBeUndefined();
  });

  test('blocks run day by day, earliest first, whatever the order of the data', () => {
    const p = weekPlanner([
      group('b', [{ day: 3, start: '18:00', end: '19:00' }, { day: 1, start: '18:00', end: '19:00' }]),
      group('a', [{ day: 3, start: '17:00', end: '18:00' }]),
    ])!;
    expect(p.blocks.map(b => `${b.day} ${b.label}`)).toEqual(['1 18:00–19:00', '3 17:00–18:00', '3 18:00–19:00']);
    expect(p.days).toEqual([{ day: 1, name: 'Luni', col: 2 }, { day: 3, name: 'Miercuri', col: 3 }]);
  });

  test('sessions that overlap on a day sit side by side, in lanes', () => {
    const p = weekPlanner([
      group('a', [{ day: 2, start: '17:00', end: '19:00' }]),
      group('b', [{ day: 2, start: '18:00', end: '20:00' }]),
      group('c', [{ day: 2, start: '20:00', end: '21:00' }, { day: 4, start: '18:00', end: '19:00' }]),
    ])!;
    const lanes = p.blocks.map(b => [b.group.slug, b.day, b.lane, b.lanes]);
    expect(lanes).toEqual([['a', 2, 0, 2], ['b', 2, 1, 2], ['c', 2, 0, 1], ['c', 4, 0, 1]]);
  });

  test('a third overlap reuses a lane that is free again', () => {
    const p = weekPlanner([
      group('a', [{ day: 1, start: '17:00', end: '18:00' }]),
      group('b', [{ day: 1, start: '17:30', end: '19:00' }]),
      group('c', [{ day: 1, start: '18:00', end: '19:00' }]),
    ])!;
    expect(p.blocks.map(b => [b.group.slug, b.lane, b.lanes])).toEqual([['a', 0, 2], ['b', 1, 2], ['c', 0, 2]]);
  });

  test('a gap shorter than two hours stays as rows; one that starts on the half hour has no mark', () => {
    const short = weekPlanner([group('a', [{ day: 1, start: '10:00', end: '11:00' }, { day: 1, start: '12:30', end: '13:00' }])])!;
    expect(short.gapRows).toEqual([]);
    expect(short.marks.map(m => m.label)).toEqual(['10:00', '11:00', '12:00', '13:00']);
    const half = weekPlanner([group('a', [{ day: 1, start: '10:00', end: '10:30' }, { day: 1, start: '13:00', end: '14:00' }])])!;
    expect(half.gapRows).toEqual([3]);
    expect(half.marks).toEqual([{ label: '10:00', row: 2 }, { label: '13:00', row: 4 }, { label: '14:00', row: 6 }]);
  });

  test('times off the half hour take the slots they touch; the label keeps the exact time', () => {
    const p = weekPlanner([group('a', [{ day: 5, start: '17:15', end: '18:45' }])])!;
    expect(p.marks).toEqual([{ label: '17:00', row: 2 }, { label: '18:00', row: 4 }, { label: '19:00', row: 6 }]);
    expect(p.blocks[0]).toMatchObject({ r1: 2, r2: 6, label: '17:15–18:45' });
  });

  test('the site data is never changed', () => {
    const before = JSON.stringify(sampleGroups);
    weekPlanner(sampleGroups);
    programView(site);
    expect(JSON.stringify(sampleGroups)).toBe(before);
  });
});

describe('plannerRows', () => {
  test('the day names, a row per half hour, the taller gap and the line under the last hour', () => {
    expect(plannerRows(weekPlanner(sampleGroups)!)).toBe(
      'auto repeat(8, var(--slot)) var(--gap-row) repeat(10, var(--slot)) 1px',
    );
  });
});

describe('scheduleLabel', () => {
  test('one time for every day, or each day with its time', () => {
    expect(scheduleLabel(initiere.sessions)).toBe('Luni, miercuri, vineri, 17:00–18:30');
    expect(scheduleLabel(performanta.sessions)).toBe('Luni 18:30–20:30, miercuri 18:30–20:30, vineri 18:30–20:30, sâmbătă 10:00–12:00');
    expect(scheduleLabel([{ day: 6, start: '10:00', end: '12:00' }, { day: 2, start: '10:00', end: '12:00' }])).toBe('Marți, sâmbătă, 10:00–12:00');
    expect(scheduleLabel([])).toBeUndefined();
  });
});

describe('groupTone', () => {
  test('the performance road in solid club colours, the play road light', () => {
    expect([0, 1, 2, 3, 4].map(groupTone)).toEqual(['red', 'blue', 'deep', 'outline', 'mist']);
    expect(groupTone(5)).toBe('red');
  });
});

describe('programView', () => {
  test('with sessions: the planner, a filter by group, the guide with coaches and the note', () => {
    const page = programView(site);
    expect(page.planner?.blocks).toHaveLength(14);
    expect(page.filters.map(f => f.label)).toEqual(['Toate grupele', 'Inițiere', 'Performanță', 'Elite', 'Amatori copii', 'Amatori adulți']);
    expect(page.filters.map(f => f.value)).toEqual(['toate', 'initiere', 'performanta', 'elite', 'amatori-copii', 'amatori-adulti']);
    expect(page.filters.map(f => f.countLabel)).toEqual([
      '14 antrenamente pe săptămână', '3 antrenamente pe săptămână la Inițiere', '4 antrenamente pe săptămână la Performanță',
      '3 antrenamente pe săptămână la Elite', '2 antrenamente pe săptămână la Amatori copii', '2 antrenamente pe săptămână la Amatori adulți',
    ]);
    expect(page.tracks.map(t => [t.title, t.groups.map(g => [g.group.name, g.tone, g.coach?.name])])).toEqual([
      ['Pentru cine vrea performanță', [['Inițiere', 'red', 'Antrenor Exemplu'], ['Performanță', 'blue', 'Antrenor Exemplu'], ['Elite', 'deep', 'Antrenor Exemplu']]],
      ['Pentru cine vrea doar să joace', [['Amatori copii', 'outline', 'Antrenor Exemplu'], ['Amatori adulți', 'mist', 'Antrenor Exemplu']]],
    ]);
    expect(page.missingCoach).toBe(false);
    expect(page.note).toBe('Notă de test pentru program.');
  });

  test('without sessions: no planner, no filter, coaches to confirm', () => {
    const page = programView(homeSite);
    expect(page.planner).toBeUndefined();
    expect(page.filters).toEqual([]);
    expect(page.missingCoach).toBe(true);
    expect(page.tracks.flatMap(t => t.groups.map(g => g.coach))).toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(page.note).toBeUndefined();
  });

  test('a single group with sessions needs no filter; groups without sessions are not offered', () => {
    const one = { ...homeSite, groups: homeSite.groups.map((g, i) => (i === 1 ? { ...g, sessions: [{ day: 1 as const, start: '18:00', end: '19:00' }] } : g)) };
    expect(programView(one).filters).toEqual([]);
    const two = { ...one, groups: one.groups.map((g, i) => (i === 3 ? { ...g, sessions: [{ day: 2 as const, start: '18:00', end: '19:00' }] } : g)) };
    expect(programView(two).filters.map(f => f.value)).toEqual(['toate', 'performanta', 'amatori-copii']);
  });

  test('one group without a known coach is enough to ask the club', () => {
    const page = programView({ ...site, groups: site.groups.map((g, i) => (i === 4 ? { ...g, coachId: 'coach-nimeni' } : g)) });
    expect(page.missingCoach).toBe(true);
    expect(page.tracks[1].groups[1].coach).toBeUndefined();
  });
});
