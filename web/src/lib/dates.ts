// Dates are ISO calendar dates ('YYYY-MM-DD') in the Europe/Bucharest calendar.
// They are handled as plain strings and day numbers, never as local Date
// time-of-day, so results do not depend on the machine's time zone.

const MONTHS_RO = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

type CalendarDate = { year: number; month: number; day: number };

function parseIso(iso: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Expected an ISO date (YYYY-MM-DD), got "${iso}"`);
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (date.month < 1 || date.month > 12) throw new Error(`Expected a month from 01 to 12, got "${iso}"`);
  if (date.day < 1 || date.day > 31) throw new Error(`Expected a day from 01 to 31, got "${iso}"`);
  return date;
}

/** True for a real-looking ISO calendar date: 'YYYY-MM-DD', month 01–12, day 01–31. */
export function isIsoDate(value: string): boolean {
  try {
    parseIso(value);
    return true;
  } catch {
    return false;
  }
}

/** The short forms of the months, for compact lists: a dot only where letters are left out ("mai"). */
const MONTHS_SHORT_RO = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'];

function monthName(month: number): string {
  return MONTHS_RO[month - 1];
}

/** 1 → 'ianuarie', 12 → 'decembrie'. */
export function monthNameRo(month: number): string {
  const name = MONTHS_RO[month - 1];
  if (!name) throw new Error(`Expected a month from 1 to 12, got ${month}`);
  return name;
}

/** The number of days in `month` (1–12) of `year`, leap years included. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The ISO weekday of a date: 1 = luni … 7 = duminică. */
export function weekdayOf(iso: string): number {
  const { year, month, day } = parseIso(iso);
  return ((new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7) + 1;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = parseIso(from);
  const b = parseIso(to);
  const msPerDay = 86_400_000;
  return (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / msPerDay;
}

/** '2026-06-30' → '30 iunie 2026' */
export function formatDateRo(iso: string): string {
  const { year, month, day } = parseIso(iso);
  return `${day} ${monthName(month)} ${year}`;
}

/**
 * '2026-11-27', '2026-11-29' → '27–29 noiembrie 2026'
 * '2026-10-30', '2026-11-01' → '30 octombrie – 1 noiembrie 2026'
 * '2026-12-30', '2027-01-02' → '30 decembrie 2026 – 2 ianuarie 2027'
 * With `{ year: false }` the shared year is left out ('27–29 noiembrie'); a range across
 * two years always keeps both.
 */
export function formatRangeRo(start: string, end: string, { year = true }: { year?: boolean } = {}): string {
  const s = parseIso(start);
  const e = parseIso(end);
  const tail = year ? ` ${e.year}` : '';
  if (s.year !== e.year) return `${formatDateRo(start)} – ${formatDateRo(end)}`;
  if (start === end) return `${s.day} ${monthName(s.month)}${tail}`;
  if (s.month !== e.month) return `${s.day} ${monthName(s.month)} – ${e.day} ${monthName(e.month)}${tail}`;
  return `${s.day}–${e.day} ${monthName(e.month)}${tail}`;
}

/**
 * A compact range without the year, for lists:
 * '2026-03-13', '2026-03-15' → '13–15 mar.'; '2026-10-30', '2026-11-01' → '30 oct. – 1 nov.'
 */
export function formatShortRangeRo(start: string, end: string): string {
  const s = parseIso(start);
  const e = parseIso(end);
  const short = (month: number) => MONTHS_SHORT_RO[month - 1];
  if (start === end) return `${s.day} ${short(s.month)}`;
  if (s.year !== e.year || s.month !== e.month) return `${s.day} ${short(s.month)} – ${e.day} ${short(e.month)}`;
  return `${s.day}–${e.day} ${short(e.month)}`;
}

/**
 * A range split for a large date: the day numbers, then the month(s) and year(s).
 * '2026-11-27', '2026-11-29' → { days: '27–29', rest: 'noiembrie 2026' }
 */
export function splitRangeRo(start: string, end: string): { days: string; rest: string } {
  const s = parseIso(start);
  const e = parseIso(end);
  const days = start === end ? `${s.day}` : `${s.day}–${e.day}`;
  if (s.year !== e.year) return { days, rest: `${monthName(s.month)} ${s.year} – ${monthName(e.month)} ${e.year}` };
  if (s.month !== e.month) return { days, rest: `${monthName(s.month)} – ${monthName(e.month)} ${e.year}` };
  return { days, rest: `${monthName(e.month)} ${e.year}` };
}

const bucharestDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Bucharest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar date in Galați at instant `now`, as 'YYYY-MM-DD'. */
export function todayInBucharest(now: Date = new Date()): string {
  const parts = Object.fromEntries(bucharestDate.formatToParts(now).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
