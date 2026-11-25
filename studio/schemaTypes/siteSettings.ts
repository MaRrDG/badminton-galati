import { defineArrayMember, defineField, defineType } from 'sanity';
import { altField, imageOptions } from './shared';

const photoWarning = 'Pagina arată mai bine cu o poză aici.';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Pagina principală',
  type: 'document',
  fields: [
    defineField({
      name: 'heroLines',
      title: 'Motto-ul din titlul mare',
      type: 'array',
      description: 'Între 2 și 4 rânduri scurte. Fiecare rând apare pe o linie separată în titlu.',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.max(20).warning('Rândurile scurte încap mai bine pe telefon.'),
        }),
      ],
      validation: (rule) => rule.required().min(2).max(4).error('Scrie între 2 și 4 rânduri.'),
    }),
    defineField({
      name: 'heroText',
      title: 'Textul de sub titlu',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().error('Scrie textul de sub titlu.'),
    }),
    defineField({
      name: 'heroPhoto',
      title: 'Poza de sus',
      type: 'image',
      description: 'Poza mare de lângă titlu.',
      options: imageOptions,
      fields: [altField],
      validation: (rule) => rule.required().warning(photoWarning),
    }),
    defineField({
      name: 'whyIntro',
      title: 'De ce badminton: textul de început',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().error('Scrie textul de început.'),
    }),
    defineField({
      name: 'whyPhoto',
      title: 'De ce badminton: poza',
      type: 'image',
      options: imageOptions,
      fields: [altField],
      validation: (rule) => rule.required().warning(photoWarning),
    }),
    defineField({
      name: 'whyPoints',
      title: 'De ce badminton: motivele',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'whyPoint',
          title: 'Motiv',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Pe scurt',
              type: 'string',
              description: 'De exemplu „Dormi mai bine”.',
              validation: (rule) => rule.required().error('Scrie motivul pe scurt.'),
            }),
            defineField({
              name: 'text',
              title: 'Explicația',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.required().error('Scrie o propoziție de explicație.'),
            }),
          ],
        }),
      ],
      validation: (rule) => rule.required().min(1).error('Adaugă cel puțin un motiv.'),
    }),
    defineField({
      name: 'hallText',
      title: 'Sala: text',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().error('Scrie textul despre sală.'),
    }),
    defineField({
      name: 'hallPhotos',
      title: 'Sala: poze',
      type: 'array',
      options: { layout: 'grid' },
      of: [
        defineArrayMember({
          name: 'hallPhoto',
          title: 'Poză',
          type: 'image',
          options: imageOptions,
          fields: [altField],
        }),
      ],
    }),
    defineField({
      name: 'groupsIntro',
      title: 'Grupe: textul de început',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().error('Scrie textul despre grupe.'),
    }),
    defineField({
      name: 'trialText',
      title: 'Antrenament de probă: text',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().error('Scrie textul despre antrenamentul de probă.'),
    }),
    defineField({
      name: 'rankingWeek',
      title: 'Săptămâna clasamentului',
      type: 'object',
      description: 'Săptămâna clasamentului federației din care sunt luate locurile sportivilor.',
      fields: [
        defineField({ name: 'week', title: 'Săptămâna', type: 'number', validation: (rule) => rule.integer().min(1).max(53) }),
        defineField({ name: 'from', title: 'De la', type: 'date' }),
        defineField({ name: 'to', title: 'Până la', type: 'date' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Pagina principală' }),
  },
});
