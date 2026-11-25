// The competition calendar (/calendar/): month grids starting on Monday, the competitions as
// blocks across their days, the season intro, the category filter and the plain list.
// Dates are ISO calendar dates in Bucharest, compared as strings (see dates.ts).
import { daysInMonth, formatRangeRo, monthNameRo, weekdayOf } from './dates';
import type { FilterOption } from './filter';
import { byStart, countdownLabel, splitCalendar } from './home';
import { feminineCountRo } from './ro';
import { COMPETITION_CATEGORIES, type Competition, type SiteData } from './types';

export type EventStatus = 'played' | 'next' | 'upcoming';

export type MonthCell =
  | { kind: 'pad'; span: number }
  | { kind: 'day'; day: number; today: boolean }
  | {
      kind: 'event';
      /** The competitions sharing this block, earliest first. */
      comps: Competition[];
      days: number[];
      /** The status of the first competition. */
      status: EventStatus;
      /** True when any of the competitions is at home. */
      home: boolean;
      /** True when one of the block's days is today. */
      today: boolean;
      /** The filter values: the lowercase categories of all the competitions, space separated. */
      filter: string;
      /** What a screen reader hears for the block: each competition's `eventLabel`, joined by "; ". */
      label: string;
    };

export type Month = { month: number; name: string; cells: MonthCell[]; empty: boolean };

export type CalendarPage = {
  year: number;
  /** Twelve months, or none when the year has no competition. */
  months: Month[];
  /** The next competition of the whole calendar; it may start in the next year. */
  next?: Competition;
  countdown?: string;
  intro: string;
  filters: FilterOption[];
  /** Competitions starting by July (the Cupele României), then the rest, each by date. */
  spring: Competition[];
  autumn: Competition[];
  todayLabel: string;
};

const LAST_SPRING_MONTH = 7;

const isoOf = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** Played once over, `next` for the given next competition, upcoming otherwise. */
export function eventStatus(c: Competition, today: string, next: Competition | undefined): EventStatus {
  if (c.end < today) return 'played';
  return c === next ? 'next' : 'upcoming';
}

const STATUS_WORDS: Record<EventStatus, string> = { played: 's-a jucat', next: 'urmează', upcoming: 'urmează' };

/** The status in words: "s-a jucat" or "urmează". */
export function statusWord(status: EventStatus): string {
  return STATUS_WORDS[status];
}

/** The city as shown: an unknown venue reads "loc de confirmat". */
export function cityLabel(c: Competition): string {
  return c.city === 'de confirmat' ? 'loc de confirmat' : c.city;
}

/** "CR U9 și CR Seniori, 13–15 martie, București, s-a jucat"; home events add ", acasă" after the city. */
export function eventLabel(c: Competition, status: EventStatus): string {
  const when = formatRangeRo(c.start, c.end, { year: false });
  return `${c.title}, ${when}, ${cityLabel(c)}${c.home ? ', acasă' : ''}, ${statusWord(status)}`;
}

/** The filter values of competitions (`data-f`): their categories, lowercase, each once, space separated. */
export function categoryFilter(comps: Competition[]): string {
  return [...new Set(comps.flatMap(c => c.categories.map(k => k.toLowerCase())))].join(' ');
}

type Cluster = { comps: Competition[]; from: number; to: number };

/**
 * The cells of one month grid (Monday first): a pad before day 1, then each day, with the
 * competitions as blocks across their days in this month. Competitions sharing a day share one
 * block over the union of their days. A block ends at each Sunday (the end of a grid row) and
 * at the end of the month, and continues in the next row or month. `today` marks its day;
 * a competition's status comes from the next one among `comps`.
 */
export function monthCells(year: number, month: number, comps: Competition[], today: string): MonthCell[] {
  const length = daysInMonth(year, month);
  const first = isoOf(year, month, 1);
  const last = isoOf(year, month, length);
  const { next } = splitCalendar(comps, today);

  // Each competition's days inside this month, merged where they share a day.
  const clusters: Cluster[] = [];
  for (const c of byStart(comps)) {
    if (c.end < first || c.start > last) continue;
    const from = c.start < first ? 1 : Number(c.start.slice(8, 10));
    const to = c.end > last ? length : Number(c.end.slice(8, 10));
    const open = clusters.at(-1);
    if (open && from <= open.to) {
      open.comps.push(c);
      open.to = Math.max(open.to, to);
    } else {
      clusters.push({ comps: [c], from, to });
    }
  }

  // Each cluster split at the end of every week.
  const blocks = new Map<number, Extract<MonthCell, { kind: 'event' }>>();
  for (const cluster of clusters) {
    const label = cluster.comps.map(c => eventLabel(c, eventStatus(c, today, next))).join('; ');
    let days: number[] = [];
    for (let d = cluster.from; d <= cluster.to; d++) {
      days.push(d);
      if (d === cluster.to || weekdayOf(isoOf(year, month, d)) === 7) {
        blocks.set(days[0], {
          kind: 'event',
          comps: cluster.comps,
          days,
          status: eventStatus(cluster.comps[0], today, next),
          home: cluster.comps.some(c => c.home),
          today: days.some(x => isoOf(year, month, x) === today),
          filter: categoryFilter(cluster.comps),
          label,
        });
        days = [];
      }
    }
  }

  const cells: MonthCell[] = [];
  const pad = weekdayOf(first) - 1;
  if (pad > 0) cells.push({ kind: 'pad', span: pad });
  for (let d = 1; d <= length; d++) {
    const block = blocks.get(d);
    if (block) {
      cells.push(block);
      d = block.days.at(-1)!;
    } else {
      cells.push({ kind: 'day', day: d, today: isoOf(year, month, d) === today });
    }
  }
  return cells;
}

/**
 * The season in one sentence, with the home events counted in words:
 * "…; cinci competiții sunt la Galați." Without a home event the sentence ends at "toamna.".
 */
export function calendarIntro(comps: Competition[]): string {
  const season =
    'Sezonul din calendarul Federației Române de Badminton. Cupele României (CR) se joacă primăvara, Campionatele Naționale (CN) toamna';
  const home = comps.filter(c => c.home).length;
  if (home === 0) return `${season}.`;
  return `${season}; ${feminineCountRo(home, 'competiție', 'competiții')} ${home === 1 ? 'este' : 'sunt'} la Galați.`;
}

/**
 * "Toate", then the categories present, in the federation's order (`COMPETITION_CATEGORIES`),
 * values lowercase. With fewer than two categories there is nothing to choose: no filter.
 */
export function calendarFilters(comps: Competition[]): FilterOption[] {
  const present = new Set(comps.flatMap(c => c.categories));
  const categories = COMPETITION_CATEGORIES.filter(k => present.has(k));
  if (categories.length < 2) return [];
  return [{ value: 'toate', label: 'Toate' }, ...categories.map(k => ({ value: k.toLowerCase(), label: k }))];
}

const capitalised = (word: string) => word[0].toLocaleUpperCase('ro') + word.slice(1);

/**
 * The calendar page for a build on `today`: the year of `today`, with only the competitions
 * starting in it; the next competition is taken from the whole calendar, so in December it may
 * be one of the next year. Never reorders the shared site data.
 */
export function calendarView(site: SiteData, today: string): CalendarPage {
  const year = Number(today.slice(0, 4));
  const comps = byStart(site.competitions.filter(c => c.start.startsWith(`${year}-`)));
  const { next } = splitCalendar(site.competitions, today);
  const countdown = next && countdownLabel(next, today);
  const months =
    comps.length === 0
      ? []
      : Array.from({ length: 12 }, (_, i): Month => {
          const cells = monthCells(year, i + 1, comps, today);
          return { month: i + 1, name: capitalised(monthNameRo(i + 1)), cells, empty: !cells.some(c => c.kind === 'event') };
        });
  const startMonth = (c: Competition) => Number(c.start.slice(5, 7));
  return {
    year,
    months,
    ...(next ? { next } : {}),
    ...(countdown ? { countdown } : {}),
    intro: calendarIntro(comps),
    filters: calendarFilters(comps),
    spring: comps.filter(c => startMonth(c) <= LAST_SPRING_MONTH),
    autumn: comps.filter(c => startMonth(c) > LAST_SPRING_MONTH),
    todayLabel: `azi, ${formatRangeRo(today, today, { year: false })}`,
  };
}
