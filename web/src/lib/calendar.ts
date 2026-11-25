// The competition calendar (/calendar/): month grids starting on Monday, the competitions as
// blocks across their days, the season intro, the category filter and the plain list.
// Dates are ISO calendar dates in Bucharest, compared as strings (see dates.ts).
import { daysInMonth, formatRangeRo, formatShortRangeRo, monthNameRo, splitRangeRo, weekdayOf } from './dates';
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
      /** Their ids, for the browser scripts. */
      ids: string[];
      days: number[];
      /** The most live status of its competitions (next, then upcoming, then played). */
      status: EventStatus;
      /** True when any of the competitions is at home. */
      home: boolean;
      /** True when one of the block's days is today. */
      today: boolean;
      /** That day, when there is one. */
      todayDay?: number;
      /** The filter values: the lowercase categories of all the competitions, space separated. */
      filter: string;
      /** What a screen reader hears for the block: each competition's `eventLabel`, joined by "; ". */
      label: string;
    };

export type Month = { month: number; name: string; cells: MonthCell[]; empty: boolean };

/** One competition as the list and the panel show it. */
export type EventView = {
  id: string;
  title: string;
  start: string;
  end: string;
  home: boolean;
  /** "loc de confirmat" for an unknown venue. */
  city: string;
  cityKnown: boolean;
  /** "13–15 mar." */
  short: string;
  /** The panel's large date: "13–15", then "martie 2026". */
  days: string;
  rest: string;
  filter: string;
  status: EventStatus;
  /** "s-a jucat" or "urmează". */
  statusText: string;
  /** `eventLabel` with its status. */
  label: string;
  postSlug?: string;
  resultsUrl?: string;
};

export type CalendarPage = {
  year: number;
  /** The build date, so the browser can tell when the page has gone stale. */
  today: string;
  /** Twelve months, or none when the year has no competition. */
  months: Month[];
  /** The next competition of the whole calendar; it may start in the next year. */
  next?: Competition;
  nextView?: EventView;
  countdown?: string;
  intro: string;
  filters: FilterOption[];
  /** Competitions starting by July (the Cupele României), then the rest, each by date. */
  spring: EventView[];
  autumn: EventView[];
  todayLabel: string;
  /** Which colours the grid uses; none without a grid. */
  legend?: { upcoming: boolean; played: boolean; home: boolean };
  /** Every competition, also of other years: the browser recomputes the statuses from them. */
  events: Competition[];
};

const LAST_SPRING_MONTH = 7;

const isoOf = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** Played once over, `next` for the competition with id `nextId`, upcoming otherwise. */
export function eventStatus(c: Pick<Competition, 'id' | 'end'>, today: string, nextId: string | undefined): EventStatus {
  if (c.end < today) return 'played';
  return c.id === nextId ? 'next' : 'upcoming';
}

const LIVENESS: Record<EventStatus, number> = { played: 0, upcoming: 1, next: 2 };

/** The status of a block shared by several competitions: the most live of theirs. */
export function blockStatus(comps: Competition[], today: string, nextId: string | undefined): EventStatus {
  return comps
    .map(c => eventStatus(c, today, nextId))
    .reduce((best, s) => (LIVENESS[s] > LIVENESS[best] ? s : best), 'played' as EventStatus);
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

/** What a screen reader hears for a block: each competition's `eventLabel`, joined by "; ". */
export function blockLabel(comps: Competition[], today: string, nextId: string | undefined): string {
  return comps.map(c => eventLabel(c, eventStatus(c, today, nextId))).join('; ');
}

/** "azi, 25 noiembrie" */
export function todayLabel(today: string): string {
  return `azi, ${formatRangeRo(today, today, { year: false })}`;
}

/** The filter values of competitions (`data-f`): their categories, lowercase, each once, space separated. */
export function categoryFilter(comps: Competition[]): string {
  return [...new Set(comps.flatMap(c => c.categories.map(k => k.toLowerCase())))].join(' ');
}

/** Everything the list and the panel show for one competition with `status`. */
export function eventView(c: Competition, status: EventStatus): EventView {
  const { days, rest } = splitRangeRo(c.start, c.end);
  return {
    id: c.id,
    title: c.title,
    start: c.start,
    end: c.end,
    home: c.home,
    city: cityLabel(c),
    cityKnown: c.city !== 'de confirmat',
    short: formatShortRangeRo(c.start, c.end),
    days,
    rest,
    filter: categoryFilter([c]),
    status,
    statusText: statusWord(status),
    label: eventLabel(c, status),
    ...(c.postSlug ? { postSlug: c.postSlug } : {}),
    ...(c.resultsUrl ? { resultsUrl: c.resultsUrl } : {}),
  };
}

type Cluster = { comps: Competition[]; from: number; to: number };

/**
 * The cells of one month grid (Monday first): a pad before day 1, then each day, with the
 * competitions as blocks across their days in this month. Competitions sharing a day share one
 * block over the union of their days. A block ends at each Sunday (the end of a grid row) and
 * at the end of the month, and continues in the next row or month. `today` marks its day.
 * `nextId` names the next competition (by default the next one among `comps`); the page passes
 * the next of the whole calendar, so the grid, the list and the panel agree.
 */
export function monthCells(
  year: number,
  month: number,
  comps: Competition[],
  today: string,
  nextId: string | undefined = splitCalendar(comps, today).next?.id,
): MonthCell[] {
  const length = daysInMonth(year, month);
  const first = isoOf(year, month, 1);
  const last = isoOf(year, month, length);

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
    const label = blockLabel(cluster.comps, today, nextId);
    let days: number[] = [];
    for (let d = cluster.from; d <= cluster.to; d++) {
      days.push(d);
      if (d === cluster.to || weekdayOf(isoOf(year, month, d)) === 7) {
        const todayDay = days.find(x => isoOf(year, month, x) === today);
        blocks.set(days[0], {
          kind: 'event',
          comps: cluster.comps,
          ids: cluster.comps.map(c => c.id),
          days,
          status: blockStatus(cluster.comps, today, nextId),
          home: cluster.comps.some(c => c.home),
          today: todayDay !== undefined,
          ...(todayDay !== undefined ? { todayDay } : {}),
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
  const nextId = next?.id;
  const countdown = next && countdownLabel(next, today);
  const months =
    comps.length === 0
      ? []
      : Array.from({ length: 12 }, (_, i): Month => {
          const cells = monthCells(year, i + 1, comps, today, nextId);
          return { month: i + 1, name: capitalised(monthNameRo(i + 1)), cells, empty: !cells.some(c => c.kind === 'event') };
        });
  const blocks = months.flatMap(m => m.cells.filter(c => c.kind === 'event'));
  const row = (c: Competition) => eventView(c, eventStatus(c, today, nextId));
  const startMonth = (c: Competition) => Number(c.start.slice(5, 7));
  return {
    year,
    today,
    months,
    ...(next ? { next, nextView: eventView(next, 'next') } : {}),
    ...(countdown ? { countdown } : {}),
    intro: calendarIntro(comps),
    filters: calendarFilters(comps),
    spring: comps.filter(c => startMonth(c) <= LAST_SPRING_MONTH).map(row),
    autumn: comps.filter(c => startMonth(c) > LAST_SPRING_MONTH).map(row),
    todayLabel: todayLabel(today),
    ...(blocks.length > 0
      ? {
          legend: {
            upcoming: blocks.some(b => b.status !== 'played'),
            played: blocks.some(b => b.status === 'played'),
            home: blocks.some(b => b.home),
          },
        }
      : {}),
    events: [...site.competitions],
  };
}
