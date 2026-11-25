// The athletes wall (/sportivi/): age categories, tile order, the category filter and its counts.
// The athlete profile (/sportivi/[slug]/): name lines, facts, the standing, articles and medals.
import { formatRangeRo } from './dates';
import type { FilterOption } from './filter';
import { bestRanking, disciplineLabel, newestFirst, pointsUnit, visibleAthletes } from './home';
import { countRo } from './ro';
import { toneAt, type Tone } from './tiles';
import type { Athlete, Discipline, Post, Ranking, RankingWeek, SiteData } from './types';

/** Youth categories by age limit: U-n while the athlete is younger than n in the season year. */
const YOUTH = [9, 11, 13, 15, 17, 19] as const;
/** Wall order, oldest first; a category outside this list follows them, an unknown one comes last. */
const OLDEST_FIRST = ['Seniori', 'U23', 'U19', 'U17', 'U15', 'U13', 'U11', 'U9'];

const byRomanianName = new Intl.Collator('ro').compare;

/**
 * The category of the athlete's best place; without a place, the one their age reaches in
 * `seasonYear`: U9 … U19 while younger than the limit, U23 from 19 to 22, Seniori from 23.
 * The age rule is to be confirmed with the club's coaches (plan 2a, Appendix A).
 */
export function athleteCategory(a: Athlete, seasonYear: number): string | undefined {
  const best = bestRanking(a);
  if (best) return best.category;
  if (a.birthYear === undefined) return undefined;
  const age = seasonYear - a.birthYear;
  const limit = YOUTH.find(n => age < n);
  if (limit !== undefined) return `U${limit}`;
  return age < 23 ? 'U23' : 'Seniori';
}

export type WallTile = {
  athlete: Athlete;
  category?: string;
  best?: Ranking;
  /** "U17, simplu băieți" with a place, "U17" with a category only. */
  caption?: string;
  tone: Tone;
  /** The filter value: the category in lowercase, or '' without one. */
  filter: string;
};

const categoryRank = (category: string | undefined) => {
  if (category === undefined) return OLDEST_FIRST.length + 1;
  const i = OLDEST_FIRST.indexOf(category);
  return i === -1 ? OLDEST_FIRST.length : i;
};

/**
 * The consented athletes as wall tiles: by category from the oldest (Seniori) to the youngest
 * (U9), athletes without a category last; inside a category ranked athletes by best place,
 * then the others by name. Neighbouring initial tiles never share a colour.
 */
export function athleteWall(athletes: Athlete[], seasonYear: number): WallTile[] {
  const entries = visibleAthletes(athletes).map(athlete => ({
    athlete,
    best: bestRanking(athlete),
    category: athleteCategory(athlete, seasonYear),
  }));
  entries.sort((x, y) => {
    const byCategory = categoryRank(x.category) - categoryRank(y.category);
    if (byCategory !== 0) return byCategory;
    if (x.best && y.best) return x.best.place - y.best.place || byRomanianName(x.athlete.name, y.athlete.name);
    if (x.best) return -1;
    if (y.best) return 1;
    return byRomanianName(x.athlete.name, y.athlete.name);
  });
  return entries.map(({ athlete, best, category }, i): WallTile => {
    const caption = best ? `${best.category}, ${disciplineLabel(best.discipline)}` : category;
    return {
      athlete,
      ...(category !== undefined ? { category } : {}),
      ...(best ? { best } : {}),
      ...(caption !== undefined ? { caption } : {}),
      tone: toneAt(i),
      filter: category?.toLowerCase() ?? '',
    };
  });
}

/** "3 sportivi", "20 de sportivi", "1 sportiv la U9". */
export function athletesCountLabel(n: number, category?: string): string {
  const count = countRo(n, 'sportiv', 'sportivi');
  return category ? `${count} la ${category}` : count;
}

/** "Toți", then one option per category on the wall, in wall order; no filter below two categories. */
export function athleteFilters(tiles: WallTile[]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const t of tiles) if (t.category !== undefined) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  if (counts.size < 2) return [];
  return [
    { value: 'toti', label: 'Toți', countLabel: athletesCountLabel(tiles.length) },
    ...[...counts].map(([category, k]) => ({
      value: category.toLowerCase(),
      label: category,
      countLabel: athletesCountLabel(k, category),
    })),
  ];
}

export type AthletesPage = { tiles: WallTile[]; filters: FilterOption[]; rankingWeek?: RankingWeek };

/** The athletes page for a build on `today` (YYYY-MM-DD): categories are counted in its year. */
export function athletesView(site: SiteData, today: string): AthletesPage {
  const tiles = athleteWall(site.athletes, Number(today.slice(0, 4)));
  return { tiles, filters: athleteFilters(tiles), ...(site.rankingWeek ? { rankingWeek: site.rankingWeek } : {}) };
}

export type Medal = 'aur' | 'argint' | 'bronz';
/** Medal order inside a year. */
const MEDALS: readonly Medal[] = ['aur', 'argint', 'bronz'];

/** The medal an article result names (" Aur " → "aur"); any other result ("locul 5") is none. */
export function medalOf(result: string): Medal | undefined {
  const word = result.trim().toLocaleLowerCase('ro');
  return MEDALS.find(m => m === word);
}

export type MedalRow = { medal: Medal; discipline?: Discipline; post: Pick<Post, 'title' | 'slug'> };

export type AthleteProfile = {
  athlete: Athlete;
  /** The family name, then the given names: the two lines of the page title. */
  nameLines: [string, string];
  category?: string;
  /** The discipline of the best place, capitalised for the facts ("Simplu băieți"). */
  discipline?: string;
  groupName?: string;
  best?: Ranking;
  /** Only with a place: "Locul 2 în țară" / "la U17, simplu băieți, cu 168 de puncte" (points only when above 0) / the FRB week. */
  standing?: { place: number; lead: string; rest: string; source?: string };
  /** The articles whose results name the athlete, newest first. */
  posts: Post[];
  /** Medals from those results, by the article's year (newest first), gold before silver before bronze. */
  medals: { year: number; rows: MedalRow[] }[];
  /** The colour of the initials when there is no photo: the same as the athlete's tile on the wall. */
  tone: Tone;
};

const capitalised = (s: string) => s.charAt(0).toLocaleUpperCase('ro') + s.slice(1);

/**
 * The profile of one consented athlete, built on `today` (YYYY-MM-DD; the category without a
 * place is counted in its year). Throws for an athlete without consent, so no page can be
 * made for one. Never reorders the site data.
 */
export function athleteProfile(site: SiteData, athlete: Athlete, today: string): AthleteProfile {
  if (athlete.consent !== true) throw new Error(`No profile without consent (athlete ${athlete.id}).`);
  const seasonYear = Number(today.slice(0, 4));
  const [first = '', ...others] = athlete.name.split(' ').filter(Boolean);
  const best = bestRanking(athlete);
  const category = athleteCategory(athlete, seasonYear);
  const groupName = site.groups.find(g => g.id === athlete.groupId)?.name;
  const tone = athleteWall(site.athletes, seasonYear).find(t => t.athlete.id === athlete.id)?.tone ?? toneAt(0);

  let standing: AthleteProfile['standing'];
  if (best) {
    // No points clause without points: never "cu 0 de puncte".
    const points = best.points ? `, cu ${best.points} ${pointsUnit(best.points)}` : '';
    const week = site.rankingWeek;
    standing = {
      place: best.place,
      lead: `Locul ${best.place} în țară`,
      rest: `la ${best.category}, ${disciplineLabel(best.discipline)}${points}`,
      ...(week ? { source: `Clasamentul FRB, săptămâna ${week.week}, ${formatRangeRo(week.from, week.to)}` } : {}),
    };
  }

  const posts = newestFirst(site.posts.filter(p => p.results.some(r => r.athleteId === athlete.id)));
  const medals: AthleteProfile['medals'] = [];
  for (const post of posts) {
    const year = Number(post.date.slice(0, 4));
    for (const r of post.results) {
      const medal = r.athleteId === athlete.id ? medalOf(r.result) : undefined;
      if (!medal) continue;
      let group = medals.find(m => m.year === year);
      if (!group) medals.push((group = { year, rows: [] }));
      group.rows.push({ medal, ...(r.discipline ? { discipline: r.discipline } : {}), post: { title: post.title, slug: post.slug } });
    }
  }
  // Posts are newest first, so the years are too; the sort is stable, so equal medals keep the post order.
  for (const group of medals) group.rows.sort((x, y) => MEDALS.indexOf(x.medal) - MEDALS.indexOf(y.medal));

  return {
    athlete,
    nameLines: [first, others.join(' ')],
    ...(category !== undefined ? { category } : {}),
    ...(best ? { discipline: capitalised(disciplineLabel(best.discipline)), best } : {}),
    ...(groupName !== undefined ? { groupName } : {}),
    ...(standing ? { standing } : {}),
    posts,
    medals,
    tone,
  };
}
