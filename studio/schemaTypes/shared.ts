import { defineField } from 'sanity';

/** Required description of an image, shown to screen readers and when the photo fails to load. */
export const altField = defineField({
  name: 'alt',
  title: 'Ce se vede în poză',
  type: 'string',
  description: 'O propoziție scurtă, pentru cine nu poate vedea poza. De exemplu „Meci de dublu în sala Siderurgistul”.',
  validation: (rule) => rule.required().error('Scrie pe scurt ce se vede în poză.'),
});

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
