import { daysBetween } from './dates';
import { countRo, feminineCountRo, unitRo } from './ro';
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

export type RosterSize = 'first' | 'second' | 'third' | 'even';
export type RosterRow = { athlete: Athlete; best?: Ranking; size: RosterSize };
export type RosterBlock = { kind: 'lead' | 'pair' | 'rest' | 'even-list'; rows: RosterRow[] };

/**
 * The homepage roster: the first `HOME_ROSTER` athletes of `rosterOrder`, grouped in blocks.
 * With places the first row is large and the next two share a row, led by a medium second
 * place; the pair is formed only when the second athlete is ranked too, so an unranked athlete
 * never takes the medium row. Everyone else follows as compact rows. Without places no athlete
 * has earned a larger row, so all rows are the same size.
 */
export function rosterLayout(a: Athlete[]): RosterBlock[] {
  const ordered = rosterOrder(a, HOME_ROSTER);
  if (ordered.length === 0) return [];
  // Ranked athletes come first, so an unranked first athlete means nobody has a place.
  const ranked = bestRanking(ordered[0]) !== undefined;
  const rows = ordered.map((athlete, i): RosterRow => {
    const best = bestRanking(athlete);
    const size: RosterSize = !ranked ? 'even' : i === 0 ? 'first' : i === 1 && best ? 'second' : 'third';
    return { athlete, ...(best ? { best } : {}), size };
  });
  if (!ranked) return [{ kind: 'even-list', rows }];
  const pairEnd = rows[1]?.size === 'second' ? 3 : 1;
  return ([
    { kind: 'lead', rows: rows.slice(0, 1) },
    { kind: 'pair', rows: rows.slice(1, pairEnd) },
    { kind: 'rest', rows: rows.slice(pairEnd) },
  ] satisfies RosterBlock[]).filter(b => b.rows.length > 0);
}

/** All posts, newest first (ISO dates compare as strings); the order of equal dates is kept. */
export function newestFirst(p: Post[]): Post[] {
  return [...p].sort((x, y) => y.date.localeCompare(x.date));
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

/**
 * The groups heading, from the data: "Cinci grupe, pe două drumuri" when both tracks have groups,
 * just "Cinci grupe" otherwise. Up to ten the count is a word, above it digits ("20 de grupe").
 */
export function groupsHeading(g: Group[]): string {
  const n = g.length;
  if (n === 0) return 'Nicio grupă deocamdată';
  const words = feminineCountRo(n, 'grupă', 'grupe');
  const count = words[0].toLocaleUpperCase('ro') + words.slice(1);
  const bothTracks = g.some(x => x.track === 'performanta') && g.some(x => x.track === 'amatori');
  return bothTracks ? `${count}, pe două drumuri` : count;
}

/** The words after a points total: 1 punct, 19 puncte, 168 de puncte. */
export function pointsUnit(n: number): string {
  return unitRo(n, 'punct', 'puncte');
}

/** Only the dates matter, so the browser can recompute the label from data attributes. */
export function countdownLabel(next: Pick<Competition, 'start' | 'end'>, today: string): string | undefined {
  const untilStart = daysBetween(today, next.start);
  if (untilStart > COUNTDOWN_MAX_DAYS) return undefined;
  if (untilStart > 1) return `peste ${countRo(untilStart, 'zi', 'zile')}`;
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
