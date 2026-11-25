// The news front (/noutati/): which post takes which place, size and colour, and the kind filter.
// A pure function of the ordered list, so the same posts always give the same page.
import type { FilterOption } from './filter';
import { newestFirst, postKindLabel } from './home';
import { POST_KINDS, type Post, type SiteData } from './types';

export type FrontTone = 'red' | 'blue' | 'mist';
/** One article on the front: its width in the 12-column grid, a photo or a colour tile. */
export type FrontItem = { post: Post; span: number; kind: 'photo' | 'tile'; tone?: FrontTone; big?: boolean };
/**
 * How the featured article meets the side column: `solo` alone across the grid, `pair` sharing one
 * row with the single side item, `full` two rows tall beside the two side items.
 */
export type FrontShape = 'solo' | 'pair' | 'full';
/** The featured article, the two beside it, rows of up to three, then the older ones as a plain list. */
export type NewsFront = { feat?: FrontItem; shape?: FrontShape; side: FrontItem[]; rows: FrontItem[][]; older: Post[] };
export type NewsPage = { front: NewsFront; filters: FilterOption[] };

const COLUMNS = 12;
const FEAT_SPAN = 8;
const SIDE = 2;
const SIDE_SPAN = 4;
/** The rows under the featured article, as drawn in the approved mockup; they repeat in this order. */
const ROW_PATTERNS = [[5, 3, 4], [5, 7], [3, 3, 6]] as const;
/** The front holds the featured article, the side pair and these many in rows. */
const IN_ROWS = ROW_PATTERNS.reduce((n, r) => n + r.length, 0);
const TONES: readonly FrontTone[] = ['red', 'blue', 'mist'];
/** From this width a tile's title is set larger. */
const BIG_SPAN = 5;

/**
 * The front of the news page, from the posts newest first (the list itself is not changed):
 * the first is featured (its photo, or a blue tile); the next two sit beside it (`shape` says how
 * many there are, so no grid cell is left empty); the next eight
 * fill rows of the widths in `ROW_PATTERNS`, and a last row with fewer posts shares the twelve
 * columns evenly; everything after is `older`. A post without a cover is a colour tile: the
 * tiles take red, blue, mist in turn, in reading order, going on from the featured tile's blue
 * so the tiles beside it are not blue too. A tile five columns wide or more is `big`.
 */
export function frontLayout(posts: Post[]): NewsFront {
  const ordered = newestFirst(posts);
  const [first, ...rest] = ordered;
  if (!first) return { side: [], rows: [], older: [] };

  let next = 0;
  const item = (post: Post, span: number): FrontItem => {
    if (post.cover) return { post, span, kind: 'photo' };
    const tone = TONES[next++ % TONES.length];
    return { post, span, kind: 'tile', tone, big: span >= BIG_SPAN };
  };

  const sidePosts = rest.slice(0, SIDE);
  const featSpan = sidePosts.length > 0 ? FEAT_SPAN : COLUMNS;
  let feat: FrontItem;
  if (first.cover) {
    feat = { post: first, span: featSpan, kind: 'photo' };
  } else {
    feat = { post: first, span: featSpan, kind: 'tile', tone: 'blue', big: true };
    next = TONES.indexOf('blue') + 1;
  }
  const side = sidePosts.map(p => item(p, SIDE_SPAN));

  const inRows = rest.slice(SIDE, SIDE + IN_ROWS);
  const rows: FrontItem[][] = [];
  let at = 0;
  for (const pattern of ROW_PATTERNS) {
    const row = inRows.slice(at, at + pattern.length);
    if (row.length === 0) break;
    const even = row.length < pattern.length;
    rows.push(row.map((p, i) => item(p, even ? COLUMNS / row.length : pattern[i])));
    at += pattern.length;
  }

  const shape: FrontShape = side.length === 0 ? 'solo' : side.length < SIDE ? 'pair' : 'full';
  return { feat, shape, side, rows, older: rest.slice(SIDE + IN_ROWS) };
}

/**
 * "Toate" with the total, then each kind that has posts, with its count. With fewer than two
 * kinds there is nothing to choose: no filter (as on the athletes and calendar pages).
 */
export function kindFilters(posts: Post[]): FilterOption[] {
  const kinds = POST_KINDS.map(kind => ({ kind, count: posts.filter(p => p.kind === kind).length })).filter(k => k.count > 0);
  if (kinds.length < 2) return [];
  return [
    { value: 'toate', label: 'Toate', count: posts.length },
    ...kinds.map(({ kind, count }) => ({ value: kind, label: postKindLabel(kind), count })),
  ];
}

/** The news page: every post on the front or in the older list, and the kind filter. */
export function newsView(site: SiteData): NewsPage {
  return { front: frontLayout(site.posts), filters: kindFilters(site.posts) };
}
