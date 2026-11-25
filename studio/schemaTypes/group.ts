import { defineField, defineType } from 'sanity';

export const group = defineType({
  name: 'group',
  title: 'Grupă',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Numele grupei',
      type: 'string',
      validation: (rule) => rule.required().error('Scrie numele grupei.'),
    }),
    defineField({
      name: 'audience',
      title: 'Pentru cine este',
      type: 'string',
      description: 'O propoziție scurtă, de exemplu „Copii care țin prima dată racheta în mână”.',
      validation: (rule) => rule.required().error('Scrie pentru cine este grupa.'),
    }),
    defineField({
      name: 'track',
      title: 'Drumul',
      type: 'string',
      description: 'Performanță: pentru cine vrea competiții. Amatori: pentru cine vrea doar să joace.',
      options: {
        list: [
          { title: 'Performanță', value: 'performanta' },
          { title: 'Amatori', value: 'amatori' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required().error('Alege drumul grupei.'),
    }),
    defineField({
      name: 'schedule',
      title: 'Program',
      type: 'string',
      description: 'Zilele și orele antrenamentelor. Lasă gol până se stabilesc.',
    }),
    defineField({
      name: 'order',
      title: 'Ordinea în listă',
      type: 'number',
      description: 'Grupele apar pe site în ordine crescătoare: 1, 2, 3…',
      validation: (rule) => rule.required().integer().min(1).error('Scrie un număr întreg, începând cu 1.'),
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'audience' },
  },
  orderings: [{ title: 'Ordinea de pe site', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
});
