import { defineField, defineType } from 'sanity';

export const competition = defineType({
  name: 'competition',
  title: 'Competiție',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Numele competiției',
      type: 'string',
      description: 'Ca în calendarul federației, de exemplu „CN U11 & CN U19”.',
      validation: (rule) => rule.required().error('Scrie numele competiției.'),
    }),
    defineField({
      name: 'city',
      title: 'Orașul',
      type: 'string',
      description: 'Dacă nu se știe încă, scrie „de confirmat”.',
      validation: (rule) => rule.required().error('Scrie orașul sau „de confirmat”.'),
    }),
    defineField({
      name: 'start',
      title: 'Prima zi',
      type: 'date',
      validation: (rule) => rule.required().error('Alege prima zi a competiției.'),
    }),
    defineField({
      name: 'end',
      title: 'Ultima zi',
      type: 'date',
      description: 'Pentru o competiție de o zi, alege aceeași zi ca la început.',
      validation: (rule) => [
        rule.required().error('Alege ultima zi a competiției.'),
        rule.custom((end, context) => {
          const start = (context.document as { start?: string } | undefined)?.start;
          if (typeof end === 'string' && start && end < start) return 'Ultima zi nu poate fi înaintea primei zile.';
          return true;
        }),
      ],
    }),
    defineField({
      name: 'home',
      title: 'Acasă, la Galați',
      type: 'boolean',
      description: 'Bifează dacă competiția se joacă la Galați.',
      initialValue: false,
    }),
    defineField({
      name: 'post',
      title: 'Articolul despre competiție',
      type: 'reference',
      description: 'Opțional. Alege articolul cu rezultatele, după ce l-ai publicat.',
      to: [{ type: 'post' }],
    }),
  ],
  preview: {
    select: { title: 'title', city: 'city', start: 'start' },
    prepare: ({ title, city, start }) => ({ title, subtitle: [city, start].filter(Boolean).join(', ') }),
  },
  orderings: [{ title: 'După dată', name: 'startAsc', by: [{ field: 'start', direction: 'asc' }] }],
});
