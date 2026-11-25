// The article page (/noutati/[slug]/): its neighbours in the news list, the gallery mosaic,
// the tagged athletes and the page view. Pure functions; the site data is never reordered.
import { athleteCategory } from './athletes';
import { bodyToHtml } from './body';
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

/** One row of "Sportivi în articol": the athlete, "U17, simplu băieți" (as on the wall), the result. */
export type TaggedRow = { athlete: Athlete; line?: string; result: string };

/**
 * One row per result of the article, in the article's order, for athletes in `athletes` only
 * (the consented ones; a result naming anyone else is left out). The line is the athlete's
 * category in `seasonYear` and the discipline: the result's own, else that of the best place.
 */
export function taggedRows(post: Post, athletes: Athlete[], seasonYear: number): TaggedRow[] {
  const rows: TaggedRow[] = [];
  for (const r of post.results) {
    const athlete = athletes.find(a => a.id === r.athleteId && a.consent === true);
    if (!athlete) continue;
    const category = athleteCategory(athlete, seasonYear);
    const discipline = r.discipline ?? bestRanking(athlete)?.discipline;
    const parts = [category, discipline && disciplineLabel(discipline)].filter(Boolean);
    rows.push({ athlete, ...(parts.length > 0 ? { line: parts.join(', ') } : {}), result: r.result });
  }
  return rows;
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
  bodyHtml: string;
  /** Only for a competition article linked to a competition of the calendar. */
  competition?: Competition;
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
    bodyHtml: bodyToHtml(post.body),
    ...(competition ? { competition } : {}),
    tagged: taggedRows(post, site.athletes, Number(today.slice(0, 4))),
    mosaic: post.gallery.map((img, i) => ({ img, shape: shapes[i] })),
    neighbours: postNeighbours(site.posts, post.slug),
  };
}
