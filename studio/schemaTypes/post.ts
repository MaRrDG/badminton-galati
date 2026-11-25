import { defineArrayMember, defineField, defineType } from 'sanity';
import { MORE_GROUP, altField, disciplines, formatDateRo, formGroups, imageOptions, slugifyRo, todayInBucharest } from './shared';

const MAIN = 'articol';

export const POST_KINDS = [
  { title: 'Competiție', value: 'competitie' },
  { title: 'Viața clubului', value: 'viata-clubului' },
  { title: 'Proiecte', value: 'proiecte' },
];

export const post = defineType({
  name: 'post',
  title: 'Articol',
  type: 'document',
  groups: formGroups({ name: MAIN, title: 'Articolul' }),
  fields: [
    defineField({
      name: 'title',
      title: 'Titlul',
      type: 'string',
      group: MAIN,
      description: 'De exemplu „Cupa României U15, București”.',
      validation: (rule) => rule.required().error('Scrie titlul articolului.'),
    }),
    defineField({
      name: 'cover',
      title: 'Poza principală',
      type: 'image',
      group: MAIN,
      description: 'Apare în lista de noutăți și sus în articol.',
      options: imageOptions,
      fields: [altField],
      validation: (rule) => rule.required().warning('Alege o poză principală: articolul arată mai bine cu ea.'),
    }),
    defineField({
      name: 'body',
      title: 'Textul',
      type: 'array',
      group: MAIN,
      description: 'Câteva rânduri despre ce s-a întâmplat. Poți lipi textul scris în WhatsApp.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Text', value: 'normal' },
            { title: 'Subtitlu', value: 'h2' },
            { title: 'Subtitlu mic', value: 'h3' },
            { title: 'Citat', value: 'blockquote' },
          ],
          lists: [
            { title: 'Listă cu puncte', value: 'bullet' },
            { title: 'Listă numerotată', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Îngroșat', value: 'strong' },
              { title: 'Înclinat', value: 'em' },
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'Adresa',
                    type: 'url',
                    description: 'De exemplu https://badminton.ro',
                    validation: (rule) =>
                      rule
                        .required()
                        .uri({ scheme: ['https', 'http', 'mailto'] })
                        .error('Lipește adresa întreagă, care începe cu https://'),
                  }),
                ],
              }),
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Galerie foto',
      type: 'array',
      group: MAIN,
      description: 'Pozele de la eveniment. Poți alege mai multe deodată.',
      options: { layout: 'grid' },
      of: [
        defineArrayMember({
          name: 'galleryImage',
          title: 'Poză',
          type: 'image',
          options: imageOptions,
          fields: [altField],
        }),
      ],
    }),
    defineField({
      name: 'kind',
      title: 'Despre ce este',
      type: 'string',
      group: MORE_GROUP,
      description: 'Este deja „Competiție”. Schimbă doar dacă articolul e despre altceva.',
      initialValue: 'competitie',
      options: { list: POST_KINDS, layout: 'radio' },
      validation: (rule) => rule.required().error('Alege despre ce este articolul.'),
    }),
    defineField({
      name: 'date',
      title: 'Data',
      type: 'date',
      group: MORE_GROUP,
      description: 'Este deja data de azi. Articolele apar pe site de la cel mai nou la cel mai vechi.',
      initialValue: () => todayInBucharest(),
      validation: (rule) => rule.required().error('Alege data articolului.'),
    }),
    defineField({
      name: 'competition',
      title: 'Competiția din calendar',
      type: 'reference',
      group: MORE_GROUP,
      description: 'Opțional. Alege competiția despre care scrii.',
      to: [{ type: 'competition' }],
    }),
    defineField({
      name: 'results',
      title: 'Rezultatele sportivilor',
      type: 'array',
      group: MORE_GROUP,
      description: 'Opțional. Câte un rând pentru fiecare rezultat.',
      of: [
        defineArrayMember({
          name: 'resultRow',
          title: 'Rezultat',
          type: 'object',
          fields: [
            defineField({
              name: 'athlete',
              title: 'Sportivul',
              type: 'reference',
              to: [{ type: 'athlete' }],
              description: 'Apar doar sportivii cu acordul părintelui bifat.',
              // Only athletes whose families agreed may be named anywhere on the site.
              options: { filter: 'consent == true' },
              validation: (rule) => rule.required().error('Alege sportivul.'),
            }),
            defineField({ name: 'discipline', title: 'Proba', type: 'string', options: { list: disciplines } }),
            defineField({
              name: 'result',
              title: 'Rezultatul',
              type: 'string',
              description: 'Scrie „aur”, „argint” sau „bronz” pentru medalii, altfel locul, de exemplu „locul 5”.',
              validation: (rule) => rule.required().error('Scrie rezultatul.'),
            }),
          ],
          preview: {
            select: { title: 'athlete.name', discipline: 'discipline', result: 'result' },
            prepare: ({ title, discipline, result }) => ({
              title: title ?? 'Sportiv neales',
              subtitle: [discipline, result].filter(Boolean).join(', '),
            }),
          },
        }),
      ],
    }),
    defineField({
      // Never typed by a coach: the publish action (studio/actions.ts) writes it from the title
      // on the first publish and never changes it afterwards, so links to the article keep working.
      name: 'slug',
      title: 'Adresa paginii',
      type: 'slug',
      group: MORE_GROUP,
      description: 'Se face singură din titlu, la prima publicare, și nu se mai schimbă.',
      readOnly: true,
      hidden: ({ value }) => !(value as { current?: string } | undefined)?.current,
      options: { source: 'title', slugify: slugifyRo },
    }),
  ],
  preview: {
    select: { title: 'title', date: 'date', kind: 'kind', media: 'cover' },
    prepare: ({ title, date, kind, media }) => ({
      title: title || 'Articol fără titlu',
      subtitle: [formatDateRo(date), POST_KINDS.find((k) => k.value === kind)?.title].filter(Boolean).join(' · '),
      media,
    }),
  },
  orderings: [{ title: 'Cele mai noi', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
});
