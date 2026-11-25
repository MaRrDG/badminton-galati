// The article page (/noutati/[slug]/): its neighbours in the news list, the gallery mosaic,
// the tagged athletes and the page view. Pure functions; the site data is never reordered.
import { athleteCategory } from './athletes';
import { bodySegments, type BodySegment } from './body';
import { formatDateRo } from './dates';
import { bestRanking, disciplineLabel, newestFirst, postKindLabel } from './home';
import { countRo } from './ro';
import type { Athlete, Competition, Img, Post, SiteData } from './types';

/**
 * The articles just before and after `slug` in the news list's order (newest first, as
 * `frontLayout` orders them); the list itself is not changed.
 */
export function postNeighbours(posts: Post[], slug: string): { older?: Post; newer?: Post } {
  const ordered = newestFirst(posts);
  const at = ordered.findIndex(p => p.slug === slug);
  if (at === -1) return {};
  const older = ordered[at + 1];
  const newer = at > 0 ? ordered[at - 1] : undefined;
  return { ...(older ? { older } : {}), ...(newer ? { newer } : {}) };
}

export type MosaicShape = 'big' | 'tall' | 'wide' | '';
/** A photo this much taller than wide spans two rows of the mosaic. */
const PORTRAIT = 1.2;
/** From this many photos the first one is big (two columns, two rows). */
const BIG_FROM = 4;

/**
 * The cell shape of each gallery photo, as in the approved mockup: the first is `big` when
 * there are four or more; a portrait photo is `tall`; otherwise every fifth (index 4, 9, …)
 * is `wide`; the rest take one cell.
 */
export function mosaicLayout(imgs: Img[]): MosaicShape[] {
  return imgs.map((img, i) => {
    if (i === 0 && imgs.length >= BIG_FROM) return 'big';
    if (img.height > PORTRAIT * img.width) return 'tall';
    return i % 5 === 4 ? 'wide' : '';
  });
}

/** "o fotografie", "7 fotografii", "20 de fotografii". */
export function photoCountLabel(n: number): string {
  return n === 1 ? 'o fotografie' : countRo(n, 'fotografie', 'fotografii');
}

/** One result of an athlete in the article; the discipline in words ("simplu fete") when known. */
export type TaggedResult = { discipline?: string; result: string };
/**
 * One row of "Sportivi în articol": the athlete, the line under the name, the results. With
 * one result the line is "U13, simplu fete" (as on the wall) and the result has no discipline
 * of its own; with several the line is the category and each result names its discipline.
 */
export type TaggedRow = { athlete: Athlete; line?: string; results: TaggedResult[] };

/**
 * One row per athlete, in the order they first appear in the article's results, for athletes
 * in `athletes` with consent only (a result naming anyone else is left out). The category is
 * counted in `seasonYear`; a single result's discipline is its own, else the best place's.
 */
export function taggedRows(post: Post, athletes: Athlete[], seasonYear: number): TaggedRow[] {
  const byAthlete = new Map<string, { athlete: Athlete; results: Post['results'] }>();
  for (const r of post.results) {
    const athlete = athletes.find(a => a.id === r.athleteId && a.consent === true);
    if (!athlete) continue;
    const entry = byAthlete.get(athlete.id) ?? { athlete, results: [] };
    entry.results.push(r);
    byAthlete.set(athlete.id, entry);
  }
  return [...byAthlete.values()].map(({ athlete, results }): TaggedRow => {
    const category = athleteCategory(athlete, seasonYear);
    if (results.length === 1) {
      const discipline = results[0].discipline ?? bestRanking(athlete)?.discipline;
      const parts = [category, discipline && disciplineLabel(discipline)].filter(Boolean);
      return { athlete, ...(parts.length > 0 ? { line: parts.join(', ') } : {}), results: [{ result: results[0].result }] };
    }
    return {
      athlete,
      ...(category !== undefined ? { line: category } : {}),
      results: results.map(r => ({ ...(r.discipline ? { discipline: disciplineLabel(r.discipline) } : {}), result: r.result })),
    };
  });
}

/** A meta description is cut at a word near this length. */
const DESCRIPTION_MAX = 160;

/**
 * The page's meta description: the text of the first plain paragraph, cut at a word with "…"
 * when longer than 160 characters; without one, "Competiție, 30 iunie 2026: {title}.".
 */
export function postDescription(post: Post): string {
  const lead = post.body.find(b => b._type === 'block' && (b.style ?? 'normal') === 'normal' && !b.listItem);
  const text = lead?._type === 'block' ? lead.children.map(c => c.text).join('').replace(/\s+/g, ' ').trim() : '';
  if (!text) return `${postKindLabel(post.kind)}, ${formatDateRo(post.date)}: ${post.title}.`;
  if (text.length <= DESCRIPTION_MAX) return text;
  const cut = text.slice(0, DESCRIPTION_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:.]$/, '')}…`;
}

export type PostPage = {
  post: Post;
  /** The body in reading order: text as HTML, photos as their own segments (see `bodySegments`). */
  body: BodySegment[];
  /** Only for a competition article linked to a competition of the calendar. */
  competition?: Competition;
  /** The competition starts in the year the calendar page shows (the build year), so it has a block there. */
  inCalendar: boolean;
  tagged: TaggedRow[];
  mosaic: { img: Img; shape: MosaicShape }[];
  neighbours: { older?: Post; newer?: Post };
};

/** The article page of `post`, built on `today` (YYYY-MM-DD; athletes' categories count in its year). */
export function postView(site: SiteData, post: Post, today: string): PostPage {
  const competition =
    post.kind === 'competitie' && post.competitionId !== undefined
      ? site.competitions.find(c => c.id === post.competitionId)
      : undefined;
  const shapes = mosaicLayout(post.gallery);
  return {
    post,
    body: bodySegments(post.body),
    ...(competition ? { competition } : {}),
    inCalendar: competition !== undefined && competition.start.startsWith(`${today.slice(0, 4)}-`),
    tagged: taggedRows(post, site.athletes, Number(today.slice(0, 4))),
    mosaic: post.gallery.map((img, i) => ({ img, shape: shapes[i] })),
    neighbours: postNeighbours(site.posts, post.slug),
  };
}
