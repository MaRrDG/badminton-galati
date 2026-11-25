import { daysBetween } from './dates';
import type { Athlete, Competition, Discipline, Group, Post, PostKind, Ranking } from './types';

/** Beyond this many days the next event gets no countdown. */
const COUNTDOWN_MAX_DAYS = 60;
const PLAYED_MAX = 3;
/** The homepage shows the newest posts and the first athletes of the roster, no more. */
export const HOME_POSTS = 3;
export const HOME_ROSTER = 3;

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

/** Consented athletes: ranked first by best place, then unranked by name; the first `limit` of them. */
export function rosterOrder(a: Athlete[], limit = Infinity): Athlete[] {
  const withBest = visibleAthletes(a).map(athlete => ({ athlete, best: bestRanking(athlete) }));
  withBest.sort((x, y) => {
    if (x.best && y.best) return x.best.place - y.best.place || byRomanianName(x.athlete.name, y.athlete.name);
    if (x.best) return -1;
    if (y.best) return 1;
    return byRomanianName(x.athlete.name, y.athlete.name);
  });
  return withBest.slice(0, limit).map(entry => entry.athlete);
}

/** Newest first (ISO dates compare as strings), at most `HOME_POSTS`. */
export function latestPosts(p: Post[]): Post[] {
  return [...p].sort((x, y) => y.date.localeCompare(x.date)).slice(0, HOME_POSTS);
}

/** Earliest start first. */
export function byStart(c: Competition[]): Competition[] {
  return [...c].sort((x, y) => x.start.localeCompare(y.start));
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
function takesDe(n: number): boolean {
  const lastTwo = n % 100;
  return lastTwo === 0 || lastTwo >= 20;
}

function daysRo(n: number): string {
  return takesDe(n) ? `${n} de zile` : `${n} zile`;
}

/** "grupă" is feminine: o grupă, două grupe. */
const GROUP_COUNT_WORDS = ['O grupă', 'Două grupe', 'Trei grupe', 'Patru grupe', 'Cinci grupe', 'Șase grupe',
  'Șapte grupe', 'Opt grupe', 'Nouă grupe', 'Zece grupe'];

/**
 * The groups heading, from the data: "Cinci grupe, pe două drumuri" when both tracks have groups,
 * just "Cinci grupe" otherwise. Up to ten the count is a word, above it digits ("20 de grupe").
 */
export function groupsHeading(g: Group[]): string {
  const n = g.length;
  if (n === 0) return 'Nicio grupă deocamdată';
  const count = GROUP_COUNT_WORDS[n - 1] ?? (takesDe(n) ? `${n} de grupe` : `${n} grupe`);
  const bothTracks = g.some(x => x.track === 'performanta') && g.some(x => x.track === 'amatori');
  return bothTracks ? `${count}, pe două drumuri` : count;
}

/** The words after a points total: 1 punct, 19 puncte, 168 de puncte. */
export function pointsUnit(n: number): string {
  if (n === 1) return 'punct';
  return takesDe(n) ? 'de puncte' : 'puncte';
}

/** Only the dates matter, so the browser can recompute the label from data attributes. */
export function countdownLabel(next: Pick<Competition, 'start' | 'end'>, today: string): string | undefined {
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
