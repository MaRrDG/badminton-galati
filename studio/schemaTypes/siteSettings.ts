import { ALL_FIELDS_GROUP, defineArrayMember, defineField, defineType } from 'sanity';
import { MORE_GROUP, altField, imageOptions } from './shared';

const photoWarning = 'Pagina arată mai bine cu o poză aici.';

/**
 * One tab per part of the homepage the visitor sees. Each tab holds one fieldset whose
 * description is the one-line hint saying where on the site the texts appear.
 */
const TABS = [
  {
    name: 'prima-pagina',
    title: 'Prima pagină',
    hint: 'Partea de sus a primei pagini, primul lucru pe care îl vede vizitatorul.',
  },
  {
    name: 'de-ce',
    title: 'De ce badminton',
    hint: 'Secțiunea „De ce badminton” de pe prima pagină, sub partea de sus.',
  },
  { name: 'sala', title: 'Sala', hint: 'Secțiunea despre sală de pe prima pagină, cu șirul de poze.' },
  {
    name: 'proba',
    title: 'Antrenament de probă',
    hint: 'Chemarea la un antrenament de probă, aproape de finalul primei pagini.',
  },
  {
    name: MORE_GROUP,
    title: 'Mai multe',
    hint: 'Textul de la începutul secțiunii despre grupe și săptămâna clasamentului federației.',
  },
] as const;

type TabName = (typeof TABS)[number]['name'];
const inTab = (tab: TabName) => ({ group: tab, fieldset: tab });

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Textele site-ului',
  type: 'document',
  groups: [
    { ...ALL_FIELDS_GROUP, hidden: true },
    ...TABS.map((tab, i) => ({ name: tab.name, title: tab.title, ...(i === 0 ? { default: true } : {}) })),
  ],
  fieldsets: TABS.map((tab) => ({ name: tab.name, title: tab.title, description: tab.hint })),
  fields: [
    defineField({
      name: 'heroLines',
      title: 'Motto-ul din titlul mare',
      type: 'array',
      ...inTab('prima-pagina'),
      description: 'Între 2 și 4 rânduri scurte, fiecare pe o linie, de exemplu „Ai reușit?” și „Continuă!”.',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.max(20).warning('Scurtează rândul: rândurile scurte încap mai bine pe telefon.'),
        }),
      ],
      validation: (rule) => rule.required().min(2).max(4).error('Scrie între 2 și 4 rânduri.'),
    }),
    defineField({
      name: 'heroText',
      title: 'Textul de sub titlu',
      type: 'text',
      rows: 3,
      ...inTab('prima-pagina'),
      validation: (rule) => rule.required().error('Scrie textul de sub titlu.'),
    }),
    defineField({
      name: 'heroPhoto',
      title: 'Poza de sus',
      type: 'image',
      ...inTab('prima-pagina'),
      description: 'Poza mare de lângă titlu.',
      options: imageOptions,
      fields: [altField],
      validation: (rule) => rule.required().warning(photoWarning),
    }),
    defineField({
      name: 'whyIntro',
      title: 'Textul de început',
      type: 'text',
      rows: 4,
      ...inTab('de-ce'),
      validation: (rule) => rule.required().error('Scrie textul de început.'),
    }),
    defineField({
      name: 'whyPhoto',
      title: 'Poza',
      type: 'image',
      ...inTab('de-ce'),
      options: imageOptions,
      fields: [altField],
      validation: (rule) => rule.required().warning(photoWarning),
    }),
    defineField({
      name: 'whyPoints',
      title: 'Motivele',
      type: 'array',
      ...inTab('de-ce'),
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
      title: 'Textul despre sală',
      type: 'text',
      rows: 4,
      ...inTab('sala'),
      validation: (rule) => rule.required().error('Scrie textul despre sală.'),
    }),
    defineField({
      name: 'hallPhotos',
      title: 'Pozele sălii',
      type: 'array',
      ...inTab('sala'),
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
      name: 'trialText',
      title: 'Textul despre antrenamentul de probă',
      type: 'text',
      rows: 3,
      ...inTab('proba'),
      validation: (rule) => rule.required().error('Scrie textul despre antrenamentul de probă.'),
    }),
    defineField({
      name: 'groupsIntro',
      title: 'Grupe: textul de început',
      type: 'text',
      rows: 3,
      ...inTab(MORE_GROUP),
      validation: (rule) => rule.required().error('Scrie textul despre grupe.'),
    }),
    defineField({
      name: 'rankingWeek',
      title: 'Săptămâna clasamentului',
      type: 'object',
      ...inTab(MORE_GROUP),
      description: 'Săptămâna clasamentului federației din care sunt luate locurile sportivilor.',
      fields: [
        defineField({ name: 'week', title: 'Săptămâna', type: 'number', validation: (rule) => rule.integer().min(1).max(53).error('Scrie numărul săptămânii, între 1 și 53.') }),
        defineField({ name: 'from', title: 'De la', type: 'date' }),
        defineField({ name: 'to', title: 'Până la', type: 'date' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Textele site-ului' }),
  },
});
