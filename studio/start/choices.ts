import { CalendarIcon } from '@sanity/icons/Calendar';
import { ClockIcon } from '@sanity/icons/Clock';
import { ComposeIcon } from '@sanity/icons/Compose';
import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe';
import { UsersIcon } from '@sanity/icons/Users';
import type { ComponentType } from 'react';
import { NAV } from '../structure';

/** A start-screen choice: either create a new document of a type, or open a navigation item. */
export type StartChoice = { title: string; hint: string; icon: ComponentType } & (
  | { create: string; open?: undefined }
  | { open: string; create?: undefined }
);

export const START_CHOICES: StartChoice[] = [
  { title: 'Scrie un articol', hint: 'După un turneu: text, poze, rezultate.', icon: ComposeIcon, create: 'post' },
  {
    title: 'Adaugă o competiție în calendar',
    hint: 'Numele, zilele și orașul.',
    icon: CalendarIcon,
    create: 'competition',
  },
  { title: 'Sportivi', hint: 'Poza, grupa și acordul părintelui.', icon: UsersIcon, open: NAV.athletes },
  { title: 'Program și grupe', hint: 'Grupele și orele de antrenament.', icon: ClockIcon, open: NAV.groups },
  {
    title: 'Textele de pe prima pagină',
    hint: 'Motto-ul, sala, antrenamentul de probă.',
    icon: EarthGlobeIcon,
    open: NAV.siteTexts,
  },
];

export const AFTER_TOURNAMENT_STEPS = [
  'Apasă „Scrie un articol”.',
  'Scrie titlul, de exemplu „Cupa României U15, București”, și câteva rânduri despre turneu.',
  'Salvează în telefon pozele primite pe WhatsApp, apoi alege-le la „Poza principală” și la „Galerie foto”. La fiecare poză scrie pe scurt ce se vede.',
  'Apasă „Publică”, jos. Data de azi și tipul „Competiție” sunt deja puse; le schimbi în „Mai multe”, dacă e nevoie.',
  'Dacă vrei, tot în „Mai multe” alegi competiția din calendar și treci rezultatele sportivilor.',
];
