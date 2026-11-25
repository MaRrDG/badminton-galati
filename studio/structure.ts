import { CalendarIcon } from '@sanity/icons/Calendar';
import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle';
import { ClockIcon } from '@sanity/icons/Clock';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';
import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe';
import { RestoreIcon } from '@sanity/icons/Restore';
import { UsersIcon } from '@sanity/icons/Users';
import { WarningOutlineIcon } from '@sanity/icons/WarningOutline';
import type { NewDocumentOptionsResolver } from 'sanity';
import type { StructureResolver } from 'sanity/structure';
import { todayInBucharest } from './schemaTypes/shared';

export const STRUCTURE_TOOL = 'structure';
const API_VERSION = '2025-02-19';

/** Ids of the top-level navigation items, in order. They are also the URL segment of each list. */
export const NAV = {
  articles: 'articole',
  calendar: 'calendar',
  athletes: 'sportivi',
  groups: 'grupe',
  siteTexts: 'siteSettings', // the singleton item keeps the singleton definition id
} as const;

/** The only types the global "create new" menu offers; groups and site texts are edited in place. */
export const CREATE_MENU_TYPES = ['post', 'competition', 'athlete'];

export const newDocumentOptions: NewDocumentOptionsResolver = (prev, { creationContext }) =>
  creationContext.type === 'global' ? prev.filter((item) => CREATE_MENU_TYPES.includes(item.templateId)) : prev;

/** Navigation organised the way the coaches think, not by document type. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Conținut')
    .items([
      S.listItem()
        .id(NAV.articles)
        .title('Articole')
        .icon(DocumentTextIcon)
        .schemaType('post')
        .child(
          S.documentTypeList('post')
            .title('Articole')
            .defaultOrdering([{ field: 'date', direction: 'desc' }]),
        ),
      S.listItem()
        .id(NAV.calendar)
        .title('Calendar')
        .icon(CalendarIcon)
        .schemaType('competition')
        // A function child, so "today" is computed when the coach opens the calendar.
        .child(() => {
          const today = todayInBucharest();
          const competitions = (id: string, title: string, filter: string, direction: 'asc' | 'desc') =>
            S.documentList()
              .id(id)
              .title(title)
              .schemaType('competition')
              .apiVersion(API_VERSION)
              .filter(`_type == "competition" && ${filter}`)
              .params({ today })
              .defaultOrdering([{ field: 'start', direction }]);
          return S.list()
            .id('calendar-liste')
            .title('Calendar')
            .items([
              S.listItem()
                .id('urmeaza')
                .title('Urmează')
                .icon(CalendarIcon)
                .schemaType('competition')
                .child(competitions('urmeaza', 'Urmează', '(!defined(end) || end >= $today)', 'asc')),
              S.listItem()
                .id('au-trecut')
                .title('Au trecut')
                .icon(RestoreIcon)
                .schemaType('competition')
                .child(competitions('au-trecut', 'Au trecut', 'end < $today', 'desc')),
            ]);
        }),
      S.listItem()
        .id(NAV.athletes)
        .title('Sportivi')
        .icon(UsersIcon)
        .schemaType('athlete')
        .child(
          S.list()
            .id('sportivi-liste')
            .title('Sportivi')
            .items([
              S.listItem()
                .id('cu-acord')
                .title('Cu acordul părintelui (apar pe site)')
                .icon(CheckmarkCircleIcon)
                .schemaType('athlete')
                .child(
                  S.documentList()
                    .id('cu-acord')
                    .title('Cu acordul părintelui')
                    .schemaType('athlete')
                    .apiVersion(API_VERSION)
                    .filter('_type == "athlete" && consent == true')
                    .defaultOrdering([{ field: 'name', direction: 'asc' }]),
                ),
              S.listItem()
                .id('fara-acord')
                .title('Fără acord (nu apar pe site)')
                .icon(WarningOutlineIcon)
                .schemaType('athlete')
                .child(
                  S.documentList()
                    .id('fara-acord')
                    .title('Fără acordul părintelui')
                    .schemaType('athlete')
                    .apiVersion(API_VERSION)
                    .filter('_type == "athlete" && consent != true')
                    .defaultOrdering([{ field: 'name', direction: 'asc' }]),
                ),
            ]),
        ),
      S.listItem()
        .id(NAV.groups)
        .title('Grupe și program')
        .icon(ClockIcon)
        .schemaType('group')
        .child(
          S.documentTypeList('group')
            .title('Grupe și program')
            .defaultOrdering([{ field: 'order', direction: 'asc' }]),
        ),
      S.listItem().singleton('siteSettings').title('Textele site-ului').icon(EarthGlobeIcon),
    ]);
