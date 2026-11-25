// The athletes wall (/sportivi/): age categories, tile order, the category filter and its counts.
import type { FilterOption } from './filter';
import { bestRanking, disciplineLabel, visibleAthletes } from './home';
import { countRo } from './ro';
import { toneAt, type Tone } from './tiles';
import type { Athlete, Ranking, RankingWeek, SiteData } from './types';

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
