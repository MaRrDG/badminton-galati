import { describe, expect, test } from 'vitest';
import {
  blockLabel, blockStatus, calendarFilters, calendarIntro, calendarView, eventLabel, eventStatus, eventView, monthCells, todayLabel, type MonthCell,
} from '../../src/lib/calendar';
import { parseSiteData } from '../../src/lib/content';
import type { Competition } from '../../src/lib/types';
import home from '../../src/fixtures/home.json';
import quiet from '../../src/fixtures/quiet-season.json';

const site = parseSiteData(home, 'home.json');
const comps = site.competitions;
const cnEchipeSeniori = comps.find(c => c.id === 'competition-2026-09-04-cn-echipe-seniori')!;
const TODAY = '2026-11-25';

type EventCell = Extract<MonthCell, { kind: 'event' }>;
const events = (cells: MonthCell[]) => cells.filter((c): c is EventCell => c.kind === 'event');
/** The day numbers a month grid shows, in order, whether plain or inside an event block. */
const dayNumbers = (cells: MonthCell[]) =>
  cells.flatMap(c => (c.kind === 'day' ? [c.day] : c.kind === 'event' ? c.days : []));
const comp = (id: string, start: string, end: string, extra: Partial<Competition> = {}): Competition =>
  ({ ...comps[0], id, title: id, start, end, ...extra });

describe('monthCells', () => {
  test('the grid starts on Monday: the first day sits under its weekday', () => {
    expect(monthCells(2026, 1, [], TODAY)[0]).toEqual({ kind: 'pad', span: 3 }); // 1 Jan 2026 is a Thursday
    expect(monthCells(2026, 3, [], TODAY)[0]).toEqual({ kind: 'pad', span: 6 }); // 1 Mar 2026 is a Sunday
    expect(monthCells(2026, 6, [], TODAY)[0]).toEqual({ kind: 'day', day: 1, today: false }); // a Monday: no pad
  });

  test('every day of the month appears once, leap years included', () => {
    const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    expect(dayNumbers(monthCells(2026, 2, [], TODAY))).toEqual(upTo(28));
    expect(dayNumbers(monthCells(2028, 2, [], TODAY))).toEqual(upTo(29));
    expect(dayNumbers(monthCells(2026, 11, comps, TODAY))).toEqual(upTo(30));
    expect(dayNumbers(monthCells(2026, 12, comps, TODAY))).toEqual(upTo(31));
  });

  test('competitions are blocks across their days, played or next; today is marked', () => {
    const nov = monthCells(2026, 11, comps, TODAY);
    expect(events(nov).map(c => [c.days, c.status])).toEqual([[[20, 21, 22], 'played'], [[27, 28, 29], 'next']]);
    expect(nov.find(c => c.kind === 'day' && c.day === 25)).toMatchObject({ today: true });
    expect(nov.filter(c => c.kind === 'day' && c.today)).toHaveLength(1);
    expect(events(nov)[1]).toMatchObject({ home: false, today: false, filter: 'u9 u17' });
  });

  test('a block is split at the end of each week and at the end of the month', () => {
    const across = { ...comps[0], id: 'x', start: '2026-03-29', end: '2026-04-01' }; // Sunday to Wednesday
    expect(events(monthCells(2026, 3, [across], TODAY)).map(c => c.days)).toEqual([[29], [30, 31]]);
    expect(events(monthCells(2026, 4, [across], TODAY)).map(c => c.days)).toEqual([[1]]);
  });

  test('an event across the new year shows in both years’ grids', () => {
    const newYear = comp('ny', '2026-12-30', '2027-01-02');
    expect(events(monthCells(2026, 12, [newYear], TODAY)).map(c => c.days)).toEqual([[30, 31]]);
    expect(events(monthCells(2027, 1, [newYear], TODAY)).map(c => c.days)).toEqual([[1, 2]]);
    expect(events(monthCells(2027, 2, [newYear], TODAY))).toEqual([]);
  });

  test('a single-day event is a one-day block', () => {
    expect(events(monthCells(2026, 6, [comp('one', '2026-06-10', '2026-06-10')], TODAY)).map(c => c.days)).toEqual([[10]]);
  });

  test('overlapping competitions share one block over all their days', () => {
    const a = { ...comps[0], id: 'a', start: '2026-06-05', end: '2026-06-07' }, b = { ...comps[0], id: 'b', start: '2026-06-06', end: '2026-06-06' };
    expect(events(monthCells(2026, 6, [a, b], TODAY)).map(c => [c.comps.length, c.days])).toEqual([[2, [5, 6, 7]]]);
    // Given in any order, the earlier one leads the block.
    expect(events(monthCells(2026, 6, [b, a], TODAY))[0].comps.map(c => c.id)).toEqual(['a', 'b']);
  });

  test('a shared block is home if any of its events is, and filters on all their categories', () => {
    const a = comp('a', '2026-06-05', '2026-06-07', { categories: ['U9', 'U11'], home: false });
    const b = comp('b', '2026-06-07', '2026-06-08', { categories: ['U11', 'Echipe'], home: true });
    const [first, second] = events(monthCells(2026, 6, [a, b], TODAY));
    // 7 June 2026 is a Sunday, so the shared block wraps to the next week.
    expect([first.days, second.days]).toEqual([[5, 6, 7], [8]]);
    expect(first).toMatchObject({ home: true, filter: 'u9 u11 echipe', status: 'played', ids: ['a', 'b'] });
    expect(first.label).toBe('a, 5–7 iunie, București, s-a jucat; b, 7–8 iunie, București, acasă, s-a jucat');
  });

  test('neighbouring competitions that do not share a day stay apart', () => {
    const a = comp('a', '2026-06-01', '2026-06-02'), b = comp('b', '2026-06-03', '2026-06-04');
    expect(events(monthCells(2026, 6, [a, b], TODAY)).map(c => c.days)).toEqual([[1, 2], [3, 4]]);
  });

  test('an event running today is the next one and carries today', () => {
    const nov = monthCells(2026, 11, comps, '2026-11-28');
    expect(events(nov).map(c => [c.status, c.today])).toEqual([['played', false], ['next', true]]);
    expect(nov.filter(c => c.kind === 'day' && c.today)).toEqual([]);
  });

  test('events after the next one are upcoming', () => {
    const nov = monthCells(2026, 11, comps, '2026-11-01');
    expect(events(nov).map(c => c.status)).toEqual(['next', 'upcoming']);
  });

  test('a shared block takes the most live status of its competitions', () => {
    const a = comp('a', '2026-11-20', '2026-11-22'), b = comp('b', '2026-11-22', '2026-11-24');
    const [block] = events(monthCells(2026, 11, [a, b], '2026-11-23'));
    expect(block.status).toBe('next');
    expect(block.label).toBe('a, 20–22 noiembrie, București, s-a jucat; b, 22–24 noiembrie, București, urmează');
  });

  test('a block knows which of its days is today', () => {
    const nov = events(monthCells(2026, 11, comps, '2026-11-28'));
    expect(nov.map(c => c.todayDay)).toEqual([undefined, 28]);
  });

  test('the next event can be given, so the grid agrees with the whole calendar', () => {
    const nov = events(monthCells(2026, 11, comps, '2026-11-01', 'elsewhere'));
    expect(nov.map(c => c.status)).toEqual(['upcoming', 'upcoming']);
  });

  test('a year other than today’s has no today', () => {
    const cells = monthCells(2027, 11, [], TODAY);
    expect(cells.filter(c => c.kind === 'day' && c.today)).toEqual([]);
  });

  test('does not reorder the competitions it is given', () => {
    const given = [...comps].reverse();
    const ids = given.map(c => c.id);
    monthCells(2026, 11, given, TODAY);
    expect(given.map(c => c.id)).toEqual(ids);
  });
});

describe('calendarIntro', () => {
  test('counts the home events in words', () => {
    expect(calendarIntro(comps)).toBe(
      'Sezonul din calendarul Federației Române de Badminton. Cupele României (CR) se joacă primăvara, Campionatele Naționale (CN) toamna; cinci competiții sunt la Galați.',
    );
    expect(calendarIntro(comps)).toMatch(/; cinci competiții sunt la Galați\.$/);
    expect(calendarIntro(comps.filter(c => c.city !== 'Galați' || c.id.includes('04-03')))).toMatch(/; o competiție este la Galați\.$/);
  });

  test('without a home event the sentence ends at the season', () => {
    expect(calendarIntro(comps.filter(c => !c.home))).toMatch(/toamna\.$/);
    expect(calendarIntro([])).toMatch(/Campionatele Naționale \(CN\) toamna\.$/);
  });
});

describe('calendarFilters', () => {
  test('"Toate", then the categories present, in the federation’s order', () => {
    expect(calendarFilters(comps).map(f => f.label)).toEqual(['Toate', 'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U23', 'Seniori', 'Echipe']);
    expect(calendarFilters(comps).map(f => f.value)).toEqual(['toate', 'u9', 'u11', 'u13', 'u15', 'u17', 'u19', 'u23', 'seniori', 'echipe']);
    const two = [comp('a', '2026-06-01', '2026-06-02', { categories: ['Echipe', 'U13'] })];
    expect(calendarFilters(two).map(f => f.label)).toEqual(['Toate', 'U13', 'Echipe']);
  });

  test('no filter with fewer than two categories', () => {
    expect(calendarFilters([])).toEqual([]);
    expect(calendarFilters([comp('a', '2026-06-01', '2026-06-02', { categories: ['U13'] })])).toEqual([]);
  });
});

describe('eventLabel', () => {
  test('title, dates, city and status, as read by a screen reader', () => {
    expect(eventLabel(comps[0], 'played')).toBe('CR U9 și CR Seniori, 13–15 martie, București, s-a jucat');
    expect(eventLabel(cnEchipeSeniori, 'played')).toBe('CN Echipe Seniori, 4–6 septembrie, loc de confirmat, s-a jucat');
    const home = comps.find(c => c.home)!;
    expect(eventLabel(home, 'played')).toBe('CR U11 și CR U17, 3–5 aprilie, Galați, acasă, s-a jucat');
    expect(eventLabel(comps.at(-1)!, 'next')).toBe('CN U9 și CN U17, 27–29 noiembrie, București, urmează');
    expect(eventLabel(comps.at(-1)!, 'upcoming')).toMatch(/, urmează$/);
  });
});

describe('calendarView', () => {
  test('the year of today, twelve months, the next event and its countdown', () => {
    const page = calendarView(site, TODAY);
    expect(page.year).toBe(2026);
    expect(page.months.map(m => m.name)).toEqual([
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
    ]);
    expect(page.months.filter(m => m.empty).map(m => m.month)).toEqual([1, 2, 6, 7, 8, 12]);
    expect(page.next?.title).toBe('CN U9 și CN U17');
    expect(page.countdown).toBe('peste 2 zile');
    expect(page.todayLabel).toBe('azi, 25 noiembrie');
    expect(page.filters).toHaveLength(10);
  });

  test('spring holds the events starting by July, autumn the rest, each by date', () => {
    const page = calendarView(site, TODAY);
    expect(page.spring.map(c => c.start)).toEqual(['2026-03-13', '2026-03-27', '2026-04-03', '2026-04-24', '2026-05-08']);
    expect(page.autumn.map(c => c.start.slice(5, 7))).toEqual(['09', '09', '09', '09', '10', '11', '11']);
    const july = calendarView({ ...site, competitions: [comp('j', '2026-07-31', '2026-08-02'), comp('a', '2026-08-01', '2026-08-01')] }, TODAY);
    expect([july.spring.map(c => c.id), july.autumn.map(c => c.id)]).toEqual([['j'], ['a']]);
  });

  test('only events starting in the year; the next one may be in the next year', () => {
    const later = comp('next-year', '2027-03-12', '2027-03-14');
    const earlier = comp('last-year', '2025-11-20', '2025-11-22');
    const page = calendarView({ ...site, competitions: [earlier, ...comps, later] }, '2026-12-10');
    expect(page.year).toBe(2026);
    expect([...page.spring, ...page.autumn].map(c => c.id)).not.toContain('next-year');
    expect([...page.spring, ...page.autumn].map(c => c.id)).not.toContain('last-year');
    expect(page.next?.id).toBe('next-year');
    expect(page.countdown).toBeUndefined(); // more than 60 days away
    expect(page.months.flatMap(m => events(m.cells)).map(e => e.status)).not.toContain('next');
  });

  test('a season over: no next event, every block played, no filter without categories', () => {
    const page = calendarView(parseSiteData(quiet, 'quiet-season.json'), TODAY);
    expect(page.next).toBeUndefined();
    expect(page.countdown).toBeUndefined();
    expect(new Set(page.months.flatMap(m => events(m.cells)).map(e => e.status))).toEqual(new Set(['played']));
    expect(page.filters).toEqual([]);
  });

  test('no competition at all: no months, no filter, no lists, the intro without a count', () => {
    const page = calendarView({ ...site, competitions: [] }, TODAY);
    expect(page.months).toEqual([]);
    expect(page.filters).toEqual([]);
    expect([page.spring, page.autumn]).toEqual([[], []]);
    expect(page.next).toBeUndefined();
    expect(page.intro).toMatch(/toamna\.$/);
  });

  test('leaves the shared site data as it was', () => {
    const before = JSON.stringify(site.competitions);
    calendarView(site, TODAY);
    calendarView(site, '2026-03-01');
    expect(JSON.stringify(site.competitions)).toBe(before);
  });
});

describe('status by id', () => {
  test('a copy of the next competition is still the next one', () => {
    const next = comps.at(-1)!;
    expect(eventStatus({ ...next }, TODAY, next.id)).toBe('next');
    expect(eventStatus(comps[0], TODAY, next.id)).toBe('played');
    expect(eventStatus(comps.at(-2)!, '2026-11-01', next.id)).toBe('upcoming');
  });

  test('blockStatus: next over upcoming over played', () => {
    const [played, next] = [comps.at(-2)!, comps.at(-1)!];
    expect(blockStatus([played, next], TODAY, next.id)).toBe('next');
    expect(blockStatus([played, next], TODAY, undefined)).toBe('upcoming');
    expect(blockStatus([played], TODAY, next.id)).toBe('played');
    expect(blockLabel([played, next], TODAY, next.id)).toBe(
      'CN U15 și CN Seniori, 20–22 noiembrie, Blejoi/Bacău, s-a jucat; CN U9 și CN U17, 27–29 noiembrie, București, urmează',
    );
  });
});

describe('eventView and todayLabel', () => {
  test('everything the list and the panel show for one competition', () => {
    expect(eventView(cnEchipeSeniori, 'played')).toEqual({
      id: cnEchipeSeniori.id, title: 'CN Echipe Seniori', start: '2026-09-04', end: '2026-09-06', home: false,
      city: 'loc de confirmat', cityKnown: false, short: '4–6 sept.', days: '4–6', rest: 'septembrie 2026',
      filter: 'seniori echipe', status: 'played', statusText: 's-a jucat',
      label: 'CN Echipe Seniori, 4–6 septembrie, loc de confirmat, s-a jucat',
    });
    const linked = { ...comps[1], postSlug: 'articol', resultsUrl: 'https://badminton.ro/r' };
    expect(eventView(linked, 'played')).toMatchObject({ postSlug: 'articol', resultsUrl: 'https://badminton.ro/r', cityKnown: true });
  });

  test('today in words', () => {
    expect(todayLabel('2026-11-25')).toBe('azi, 25 noiembrie');
    expect(todayLabel('2027-01-01')).toBe('azi, 1 ianuarie');
  });
});

describe('calendarView: one next event for the whole page', () => {
  test('rows carry their status; the legend names what the grid shows', () => {
    const page = calendarView(site, TODAY);
    expect(page.today).toBe(TODAY);
    expect(page.spring.map(r => r.status)).toEqual(['played', 'played', 'played', 'played', 'played']);
    expect(page.autumn.at(-1)).toMatchObject({ title: 'CN U9 și CN U17', status: 'next', statusText: 'urmează' });
    expect(page.nextView).toMatchObject({ title: 'CN U9 și CN U17', days: '27–29', rest: 'noiembrie 2026', status: 'next' });
    expect(page.legend).toEqual({ upcoming: true, played: true, home: true });
    expect(page.events.map(c => c.id)).toEqual(comps.map(c => c.id));
  });

  test('an event across the new year is next for the panel, and no block of the year pretends to be', () => {
    const across = comp('across', '2025-12-30', '2026-01-02');
    const page = calendarView({ ...site, competitions: [across, ...comps] }, '2026-01-01');
    expect(page.next?.id).toBe('across');
    const statuses = page.months.flatMap(m => events(m.cells)).map(e => e.status);
    expect(statuses).not.toContain('next');
    expect(statuses[0]).toBe('upcoming');
    expect([...page.spring, ...page.autumn].map(r => r.status)).not.toContain('next');
    expect(page.events.map(c => c.id)).toContain('across'); // the browser recomputes from every competition
  });

  test('a season over: the legend has nothing coming', () => {
    const page = calendarView(parseSiteData(quiet, 'quiet-season.json'), TODAY);
    expect(page.legend).toEqual({ upcoming: false, played: true, home: true });
    expect(page.nextView).toBeUndefined();
  });

  test('no competition: no legend', () => {
    expect(calendarView({ ...site, competitions: [] }, TODAY).legend).toBeUndefined();
  });
});
