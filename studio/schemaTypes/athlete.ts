import { defineArrayMember, defineField, defineType } from 'sanity';
import { MORE_GROUP, altField, disciplines, formGroups, imageOptions, slugifyRo } from './shared';

const MAIN = 'sportiv';

/** Shown in the athlete list for anyone whose parental consent is not ticked. */
export const NO_CONSENT_MARK = 'Fără acord părinte, nu apare pe site';

export const athlete = defineType({
  name: 'athlete',
  title: 'Sportiv',
  type: 'document',
  groups: formGroups({ name: MAIN, title: 'Sportivul' }),
  fields: [
    defineField({
      name: 'name',
      title: 'Nume și prenume',
      type: 'string',
      group: MAIN,
      description: 'Ca în clasamentul federației, de exemplu „Nistor Cristian-Ionuț”.',
      validation: (rule) => rule.required().error('Scrie numele sportivului.'),
    }),
    defineField({
      name: 'photo',
      title: 'Poza',
      type: 'image',
      group: MAIN,
      description: 'O poză în care se vede bine sportivul.',
      options: imageOptions,
      fields: [altField],
    }),
    defineField({
      name: 'group',
      title: 'Grupa',
      type: 'reference',
      group: MAIN,
      description: 'Grupa în care se antrenează.',
      to: [{ type: 'group' }],
    }),
    defineField({
      name: 'consent',
      title: 'Acord părinte',
      type: 'boolean',
      group: MAIN,
      description:
        'Cu bifă, sportivul apare pe site și poate fi trecut la rezultate. Bifează doar după ce clubul are acordul scris al părintelui.',
      initialValue: false,
    }),
    defineField({
      name: 'frbUrl',
      title: 'Pagina de pe badminton.ro',
      type: 'url',
      group: MORE_GROUP,
      description: 'Linkul către pagina sportivului de pe site-ul federației, de exemplu https://badminton.ro/jucator/236/…',
      validation: (rule) => rule.uri({ scheme: ['https', 'http'] }).error('Lipește linkul întreg, care începe cu https://'),
    }),
    defineField({
      // Never typed by a coach: the publish action (studio/actions.ts) writes it from the name
      // on the first publish and never changes it afterwards, so links to the athlete keep working.
      name: 'slug',
      title: 'Adresa paginii',
      type: 'slug',
      group: MORE_GROUP,
      description: 'Se face singură din nume, la prima publicare, și nu se mai schimbă.',
      readOnly: true,
      hidden: ({ value }) => !(value as { current?: string } | undefined)?.current,
      options: { source: 'name', slugify: slugifyRo },
    }),
    defineField({
      name: 'rankings',
      title: 'Locuri în clasamentul federației',
      type: 'array',
      group: MORE_GROUP,
      description: 'Se completează automat din clasamentul de pe badminton.ro. Nu se modifică de mână.',
      readOnly: true,
      // Only the FRB sync writes rankings: nothing to show until it has.
      hidden: ({ value }) => !Array.isArray(value) || value.length === 0,
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
    select: { title: 'name', consent: 'consent', media: 'photo', category: 'rankings.0.category', group: 'group.name' },
    prepare: ({ title, consent, media, category, group }) => ({
      title: title || 'Sportiv fără nume',
      subtitle: [consent === true ? undefined : NO_CONSENT_MARK, category, group].filter(Boolean).join(' · '),
      media,
    }),
  },
  orderings: [{ title: 'După nume', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
});
