import { CalendarIcon } from '@sanity/icons/Calendar';
import { HomeIcon } from '@sanity/icons/Home';
import { defineField, defineType } from 'sanity';
import { MORE_GROUP, formatDateRangeRo, formGroups, isGalati } from './shared';

const MAIN = 'competitie';

export const competition = defineType({
  name: 'competition',
  title: 'Competiție',
  type: 'document',
  icon: CalendarIcon,
  groups: formGroups({ name: MAIN, title: 'Competiția' }),
  fields: [
    defineField({
      name: 'title',
      title: 'Numele competiției',
      type: 'string',
      group: MAIN,
      description: 'Ca în calendarul federației, de exemplu „CN U11 și CN U19”.',
      validation: (rule) => rule.required().error('Scrie numele competiției.'),
    }),
    defineField({
      name: 'start',
      title: 'Prima zi',
      type: 'date',
      group: MAIN,
      validation: (rule) => rule.required().error('Alege prima zi a competiției.'),
    }),
    defineField({
      name: 'end',
      title: 'Ultima zi',
      type: 'date',
      group: MAIN,
      description: 'Pentru o competiție de o zi, alege aceeași zi ca la început.',
      validation: (rule) => [
        rule.required().error('Alege ultima zi a competiției.'),
        rule.custom((end, context) => {
          const start = (context.document as { start?: string } | undefined)?.start;
          if (typeof end === 'string' && start && end < start) return 'Alege o ultimă zi egală cu prima zi sau după ea.';
          return true;
        }),
      ],
    }),
    defineField({
      name: 'city',
      title: 'Orașul',
      type: 'string',
      group: MAIN,
      description: 'De exemplu „Brașov”. Dacă nu se știe încă, scrie „de confirmat”.',
      validation: (rule) => rule.required().error('Scrie orașul sau „de confirmat”.'),
    }),
    defineField({
      // Derived, never ticked by hand: the publish action (studio/actions.ts) sets it from `city`.
      name: 'home',
      title: 'Acasă, la Galați',
      type: 'boolean',
      group: MORE_GROUP,
      description: 'Se bifează singur la publicare când orașul este Galați.',
      initialValue: false,
      readOnly: true,
    }),
    defineField({
      name: 'post',
      title: 'Articolul despre competiție',
      type: 'reference',
      group: MORE_GROUP,
      description: 'Opțional. Alege articolul cu rezultatele, după ce l-ai publicat.',
      to: [{ type: 'post' }],
    }),
  ],
  preview: {
    select: { title: 'title', city: 'city', start: 'start', end: 'end', home: 'home' },
    prepare: ({ title, city, start, end, home }) => {
      const atHome = home === true || isGalati(city);
      return {
        title: title || 'Competiție fără nume',
        subtitle: [formatDateRangeRo(start, end), atHome ? 'Acasă, la Galați' : city].filter(Boolean).join(' · '),
        media: atHome ? HomeIcon : CalendarIcon,
      };
    },
  },
  orderings: [{ title: 'După dată', name: 'startAsc', by: [{ field: 'start', direction: 'asc' }] }],
});
