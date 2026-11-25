import { defineArrayMember, defineField, defineType } from 'sanity';
import { altField, disciplines, imageOptions, slugifyRo } from './shared';

export const athlete = defineType({
  name: 'athlete',
  title: 'Sportiv',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nume și prenume',
      type: 'string',
      description: 'Ca în clasamentul federației, de exemplu „Nistor Cristian-Ionuț”.',
      validation: (rule) => rule.required().error('Scrie numele sportivului.'),
    }),
    defineField({
      name: 'slug',
      title: 'Adresa paginii',
      type: 'slug',
      description: 'Se completează din nume: apasă butonul de lângă câmp.',
      options: { source: 'name', slugify: slugifyRo },
      validation: (rule) => rule.required().error('Completează adresa paginii din nume.'),
    }),
    defineField({
      name: 'consent',
      title: 'Acord părinte',
      type: 'boolean',
      description:
        'Bifează doar după ce ai acordul scris al părintelui. Fără bifă, sportivul nu apare nicăieri pe site.',
      initialValue: false,
    }),
    defineField({
      name: 'frbUrl',
      title: 'Pagina de pe badminton.ro',
      type: 'url',
      description: 'Linkul către pagina sportivului de pe site-ul federației.',
      validation: (rule) => rule.uri({ scheme: ['https', 'http'] }),
    }),
    defineField({
      name: 'photo',
      title: 'Poza principală',
      type: 'image',
      options: imageOptions,
      fields: [altField],
    }),
    defineField({
      name: 'group',
      title: 'Grupa',
      type: 'reference',
      to: [{ type: 'group' }],
    }),
    defineField({
      name: 'rankings',
      title: 'Locuri în clasamentul federației',
      type: 'array',
      description: 'Se completează automat din clasamentul de pe badminton.ro. Nu se modifică de mână.',
      readOnly: true,
      of: [
        defineArrayMember({
          name: 'ranking',
          title: 'Loc în clasament',
          type: 'object',
          fields: [
            defineField({ name: 'category', title: 'Categoria', type: 'string', description: 'De exemplu U13, U17, Seniori.' }),
            defineField({ name: 'discipline', title: 'Proba', type: 'string', options: { list: disciplines } }),
            defineField({ name: 'place', title: 'Locul', type: 'number' }),
            defineField({ name: 'points', title: 'Puncte', type: 'number' }),
          ],
          preview: {
            select: { category: 'category', discipline: 'discipline', place: 'place' },
            prepare: ({ category, discipline, place }) => ({
              title: `Locul ${place ?? '?'}`,
              subtitle: [category, discipline].filter(Boolean).join(', '),
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'name', consent: 'consent', media: 'photo' },
    prepare: ({ title, consent, media }) => ({
      title,
      subtitle: consent ? 'Apare pe site' : 'Nu apare pe site: lipsește acordul părintelui',
      media,
    }),
  },
  orderings: [{ title: 'După nume', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
});
