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
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function monthName(month: number): string {
  return MONTHS_RO[month - 1];
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
 */
export function formatRangeRo(start: string, end: string): string {
  if (start === end) return formatDateRo(start);
  const s = parseIso(start);
  const e = parseIso(end);
  if (s.year !== e.year) return `${formatDateRo(start)} – ${formatDateRo(end)}`;
  if (s.month !== e.month) return `${s.day} ${monthName(s.month)} – ${e.day} ${monthName(e.month)} ${e.year}`;
  return `${s.day}–${e.day} ${monthName(e.month)} ${e.year}`;
}
