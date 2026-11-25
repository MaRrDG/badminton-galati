import { isIsoDate, todayInBucharest } from './dates';
import { byStart, latestPosts, visibleAthletes } from './home';
import { fetchHomeQuery, toHomeData } from './sanity';
import { DISCIPLINES, POST_KINDS, TRACKS, type HomeData } from './types';

const DEFAULT_FIXTURE = 'home.json';

/** Every fixture in src/fixtures, loaded on demand; works the same under Astro and Vitest. */
const fixtures = import.meta.glob<unknown>('../fixtures/*.json', { import: 'default' });

type Source = 'fixtures' | 'sanity';

/** `CONTENT_SOURCE` wins; without it, Sanity is used only when a project id is configured. */
function contentSource(): Source {
  const value = process.env.CONTENT_SOURCE;
  if (!value) return process.env.SANITY_PROJECT_ID ? 'sanity' : 'fixtures';
  if (value === 'fixtures' || value === 'sanity') return value;
  throw new Error(`CONTENT_SOURCE must be "fixtures" or "sanity", got "${value}".`);
}

/**
 * The date the homepage is built for: today in Bucharest, or `BUILD_TODAY` (YYYY-MM-DD)
 * when set, so tests and rebuilds of a past day give the same page.
 */
export function buildToday(): string {
  const pinned = process.env.BUILD_TODAY;
  if (!pinned) return todayInBucharest();
  if (!isIsoDate(pinned)) throw new Error(`BUILD_TODAY must be a date written YYYY-MM-DD, got "${pinned}".`);
  return pinned;
}

/** All homepage content, from Sanity or from `src/fixtures/${HOME_FIXTURE ?? 'home.json'}`. */
export async function getHomeData(): Promise<HomeData> {
  if (contentSource() === 'sanity') {
    const projectId = process.env.SANITY_PROJECT_ID;
    if (!projectId) {
      throw new Error('CONTENT_SOURCE=sanity needs SANITY_PROJECT_ID, the id of the Sanity project (see web/.env.example).');
    }
    const dataset = process.env.SANITY_DATASET || 'production';
    const raw = await fetchHomeQuery({ projectId, dataset });
    return parseHomeData(toHomeData(raw), `Sanity ${projectId}/${dataset}`);
  }
  const name = process.env.HOME_FIXTURE || DEFAULT_FIXTURE;
  const load = fixtures[`../fixtures/${name}`];
  if (!load) {
    const available = Object.keys(fixtures).map(path => path.replace('../fixtures/', '')).join(', ');
    throw new Error(`HOME_FIXTURE "${name}" is not in src/fixtures. Available: ${available}.`);
  }
  return parseHomeData(await load(), name);
}

/**
 * Checks that `value` has the shape of `HomeData`, so a malformed fixture or an incomplete
 * Sanity document fails the build with the path of the bad field. Optional fields must be
 * left out, not null. Whatever the source, returns only consented athletes, competitions by
 * start date and the newest posts, so the order of a fixture file does not matter.
 */
export function parseHomeData(value: unknown, source: string): HomeData {
  const fail = (path: string, expected: string): never => {
    throw new Error(`${source}: ${path} must be ${expected}.`);
  };
  const record = (v: unknown, path: string): Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(path, 'an object');
  const text = (v: unknown, path: string) => {
    if (typeof v !== 'string' || v.trim() === '') fail(path, 'a non-empty string');
  };
  const count = (v: unknown, path: string) => {
    if (!Number.isInteger(v) || (v as number) < 1) fail(path, 'a whole number of at least 1');
  };
  const isoDate = (v: unknown, path: string) => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(path, 'a date written YYYY-MM-DD');
  };
  const bool = (v: unknown, path: string) => {
    if (typeof v !== 'boolean') fail(path, 'true or false');
  };
  const oneOf = (options: readonly string[]) => (v: unknown, path: string) => {
    if (!options.includes(v as string)) fail(path, `one of ${options.join(', ')}`);
  };
  const list = (v: unknown, path: string, item: (x: unknown, p: string) => void) => {
    if (!Array.isArray(v)) fail(path, 'a list');
    (v as unknown[]).forEach((x, i) => item(x, `${path}[${i}]`));
  };
  const join = (path: string, key: string) => (path ? `${path}.${key}` : key);
  const optional = (o: Record<string, unknown>, key: string, path: string, check: (v: unknown, p: string) => void) => {
    if (o[key] !== undefined) check(o[key], join(path, key));
  };
  const fields = (o: Record<string, unknown>, path: string, checks: Record<string, (v: unknown, p: string) => void>) => {
    for (const [key, check] of Object.entries(checks)) check(o[key], join(path, key));
  };
  const img = (v: unknown, path: string) => fields(record(v, path), path, { url: text, width: count, height: count, alt: text });

  const d = record(value, 'the content');
  fields(d, '', {
    heroLines: (v, p) => list(v, p, text),
    heroText: text,
    whyIntro: text,
    whyPoints: (v, p) => list(v, p, (x, q) => fields(record(x, q), q, { title: text, text })),
    hallText: text,
    hallPhotos: (v, p) => list(v, p, img),
    groupsIntro: text,
    trialText: text,
    athletes: (v, p) => list(v, p, (x, q) => {
      const a = record(x, q);
      fields(a, q, {
        id: text, name: text, slug: text, consent: bool,
        rankings: (r, rp) => list(r, rp, (y, yp) => {
          const ranking = record(y, yp);
          fields(ranking, yp, { category: text, discipline: oneOf(DISCIPLINES), place: count });
          optional(ranking, 'points', yp, (n, np) => { if (typeof n !== 'number') fail(np, 'a number'); });
        }),
      });
      optional(a, 'frbUrl', q, text);
      optional(a, 'photo', q, img);
    }),
    competitions: (v, p) => list(v, p, (x, q) => {
      const c = record(x, q);
      fields(c, q, { id: text, title: text, city: text, start: isoDate, end: isoDate, home: bool });
      optional(c, 'postSlug', q, text);
    }),
    groups: (v, p) => list(v, p, (x, q) => {
      const g = record(x, q);
      fields(g, q, { name: text, audience: text, track: oneOf(TRACKS) });
      optional(g, 'schedule', q, text);
    }),
    posts: (v, p) => list(v, p, (x, q) => {
      const post = record(x, q);
      fields(post, q, { title: text, slug: text, kind: oneOf(POST_KINDS), date: isoDate });
      optional(post, 'cover', q, img);
    }),
  });
  if ((d.heroLines as unknown[]).length === 0) fail('heroLines', 'a list with at least one line');
  optional(d, 'heroPhoto', '', img);
  optional(d, 'whyPhoto', '', img);
  optional(d, 'rankingWeek', '', (v, p) => fields(record(v, p), p, { week: count, from: isoDate, to: isoDate }));

  const home = d as HomeData;
  return {
    ...home,
    athletes: visibleAthletes(home.athletes),
    competitions: byStart(home.competitions),
    posts: latestPosts(home.posts),
  };
}
