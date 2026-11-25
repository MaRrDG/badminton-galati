import { defineArrayMember, defineField, defineType } from 'sanity';
import { altField, disciplines, imageOptions, slugifyRo } from './shared';

export const post = defineType({
  name: 'post',
  title: 'Articol',
  type: 'document',
  fieldsets: [
    {
      name: 'legaturi',
      title: 'Legături',
      description: 'Opțional: competiția din calendar și rezultatele sportivilor.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Titlul',
      type: 'string',
      description: 'De exemplu „București, Cupa României U15 – 2026”.',
      validation: (rule) => rule.required().error('Scrie titlul articolului.'),
    }),
    defineField({
      name: 'kind',
      title: 'Despre ce este',
      type: 'string',
      options: {
        list: [
          { title: 'Competiție', value: 'competitie' },
          { title: 'Viața clubului', value: 'viata-clubului' },
          { title: 'Proiecte', value: 'proiecte' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required().error('Alege despre ce este articolul.'),
    }),
    defineField({
      name: 'date',
      title: 'Data',
      type: 'date',
      validation: (rule) => rule.required().error('Alege data articolului.'),
    }),
    defineField({
      name: 'cover',
      title: 'Poza principală',
      type: 'image',
      description: 'Apare în lista de noutăți și în capul articolului.',
      options: imageOptions,
      fields: [altField],
    }),
    defineField({
      name: 'body',
      title: 'Textul articolului',
      type: 'array',
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
                    validation: (rule) => rule.required().uri({ scheme: ['https', 'http', 'mailto'] }),
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
      description: 'Pozele de la eveniment. Le poți adăuga mai multe deodată.',
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
      name: 'slug',
      title: 'Adresa paginii',
      type: 'slug',
      description: 'Se completează din titlu: apasă butonul de lângă câmp.',
      options: { source: 'title', slugify: slugifyRo },
      validation: (rule) => rule.required().error('Completează adresa paginii din titlu.'),
    }),
    defineField({
      name: 'competition',
      title: 'Competiția din calendar',
      type: 'reference',
      fieldset: 'legaturi',
      to: [{ type: 'competition' }],
    }),
    defineField({
      name: 'results',
      title: 'Rezultate',
      type: 'array',
      fieldset: 'legaturi',
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
  ],
  preview: {
    select: { title: 'title', date: 'date', media: 'cover' },
    prepare: ({ title, date, media }) => ({ title, subtitle: date, media }),
  },
  orderings: [{ title: 'Cele mai noi', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
});
