import { ALL_FIELDS_GROUP, defineField } from 'sanity';

/** Required description of an image, shown to screen readers and when the photo fails to load. */
export const altField = defineField({
  name: 'alt',
  title: 'Ce se vede în poză',
  type: 'string',
  description: 'Descrie poza pe scurt, pentru cei care nu o văd. De exemplu „Meci de dublu în sala Siderurgistul”.',
  validation: (rule) => rule.required().error('Scrie pe scurt ce se vede în poză.'),
});

/**
 * Form tabs. Every document form opens on its first tab, which holds only what a coach needs
 * for the common task; everything else goes to „Mai multe”. The built-in "all fields" tab is
 * hidden, so a field without a group would be unreachable: every field must name a group.
 */
export const MORE_GROUP = 'mai-multe';
export const formGroups = (main: { name: string; title: string }) => [
  { ...ALL_FIELDS_GROUP, hidden: true },
  { name: main.name, title: main.title, default: true },
  { name: MORE_GROUP, title: 'Mai multe' },
];

/** Image options shared by every photo field: lets the coach pick the important area for cropping. */
export const imageOptions = { hotspot: true } as const;

/** FRB discipline codes, as used in the federation rankings. */
export const disciplines = [
  { title: 'Simplu băieți', value: 'SB' },
  { title: 'Simplu fete', value: 'SF' },
  { title: 'Dublu băieți', value: 'DB' },
  { title: 'Dublu fete', value: 'DF' },
  { title: 'Dublu mixt', value: 'DX' },
];

/** Turns a Romanian name or title into a URL slug: "Nistor Cristian-Ionuț" -> "nistor-cristian-ionut". */
export const slugifyRo = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining accents left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

/** True for "Galați" however it is typed (diacritics, case, the cedilla t U+0163, spaces). */
export const isGalati = (city: string | undefined | null): boolean => slugifyRo(city ?? '') === 'galati';

/** Today's date in Bucharest as YYYY-MM-DD (the format of Sanity `date` fields). */
export function todayInBucharest(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const MONTHS_RO = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

const parseDate = (iso: string | undefined | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return undefined;
  const month = MONTHS_RO[Number(match[2]) - 1];
  return month ? { year: match[1]!, month, day: String(Number(match[3])) } : undefined;
};

/** "2026-11-14" -> "14 noiembrie 2026", for list previews. */
export function formatDateRo(iso: string | undefined | null): string | undefined {
  const d = parseDate(iso);
  return d && `${d.day} ${d.month} ${d.year}`;
}

/** A competition's days: "14–16 noiembrie 2026", "30 noiembrie – 2 decembrie 2026", or one day. */
export function formatDateRangeRo(start: string | undefined | null, end: string | undefined | null): string | undefined {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s) return undefined;
  if (!e || start === end) return formatDateRo(start);
  if (s.year !== e.year) return `${formatDateRo(start)} – ${formatDateRo(end)}`;
  if (s.month !== e.month) return `${s.day} ${s.month} – ${e.day} ${e.month} ${e.year}`;
  return `${s.day}–${e.day} ${e.month} ${e.year}`;
}
