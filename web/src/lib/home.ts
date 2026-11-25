import { daysBetween } from './dates';
import type { Athlete, Competition, Discipline, PostKind, Ranking } from './types';

/** Beyond this many days the next event gets no countdown. */
const COUNTDOWN_MAX_DAYS = 60;
const PLAYED_MAX = 3;

const byRomanianName = new Intl.Collator('ro').compare;

/** Only athletes whose families agreed to publication may appear anywhere. */
export function visibleAthletes(a: Athlete[]): Athlete[] {
  return a.filter(athlete => athlete.consent === true);
}

/** The ranking with the lowest place, if the athlete has any. */
export function bestRanking(a: Athlete): Ranking | undefined {
  let best: Ranking | undefined;
  for (const r of a.rankings) {
    if (!best || r.place < best.place) best = r;
  }
  return best;
}

/** Consented athletes: ranked first by best place, then unranked by name. */
export function rosterOrder(a: Athlete[]): Athlete[] {
  const withBest = visibleAthletes(a).map(athlete => ({ athlete, best: bestRanking(athlete) }));
  withBest.sort((x, y) => {
    if (x.best && y.best) return x.best.place - y.best.place || byRomanianName(x.athlete.name, y.athlete.name);
    if (x.best) return -1;
    if (y.best) return 1;
    return byRomanianName(x.athlete.name, y.athlete.name);
  });
  return withBest.map(entry => entry.athlete);
}

/**
 * `next` is the earliest event not yet over (an event in progress counts);
 * `played` holds finished events, newest first, at most three.
 * ISO date strings compare correctly as plain strings.
 */
export function splitCalendar(c: Competition[], today: string): { next?: Competition; played: Competition[] } {
  const upcoming = c.filter(comp => comp.end >= today).sort((x, y) => x.start.localeCompare(y.start));
  const played = c
    .filter(comp => comp.end < today)
    .sort((x, y) => y.start.localeCompare(x.start))
    .slice(0, PLAYED_MAX);
  return { next: upcoming[0], played };
}

/** Romanian takes "de" when the last two digits are 00 or 20–99: "19 zile", "20 de zile". */
function daysRo(n: number): string {
  const lastTwo = n % 100;
  return lastTwo === 0 || lastTwo >= 20 ? `${n} de zile` : `${n} zile`;
}

export function countdownLabel(next: Competition, today: string): string | undefined {
  const untilStart = daysBetween(today, next.start);
  if (untilStart > COUNTDOWN_MAX_DAYS) return undefined;
  if (untilStart > 1) return `peste ${daysRo(untilStart)}`;
  if (untilStart === 1) return 'începe mâine';
  if (untilStart === 0) return 'începe azi';
  if (today <= next.end) return 'în desfășurare';
  return undefined;
}

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  SB: 'simplu băieți',
  SF: 'simplu fete',
  DB: 'dublu băieți',
  DF: 'dublu fete',
  DX: 'dublu mixt',
};

export function disciplineLabel(d: Discipline): string {
  return DISCIPLINE_LABELS[d];
}

const POST_KIND_LABELS: Record<PostKind, string> = {
  competitie: 'Competiție',
  'viata-clubului': 'Viața clubului',
  proiecte: 'Proiecte',
};

export function postKindLabel(k: PostKind): string {
  return POST_KIND_LABELS[k];
}
