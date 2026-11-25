import { createClient } from '@sanity/client';
import { HOME_POSTS, visibleAthletes } from './home';
import type { Athlete, Competition, Discipline, Group, Img, Post, PostKind, Ranking, SiteData } from './types';

const API_VERSION = '2025-02-19';

/**
 * The Studio's slug rule (`studio/schemaTypes/shared.ts`): diacritics stripped, lowercase,
 * every run of other characters as one `-`. "Amatori adulți" -> "amatori-adulti".
 */
export function slugifyRo(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining accents left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/** Projects an image field to the fields of `Img`, with the pixel size from the asset metadata. */
const IMAGE = `{ alt, "url": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height }`;

/**
 * Everything the homepage needs, in one request; until plan 2b this is all the Sanity source
 * serves (three posts; of the inner-page fields only the venue photo, whose Studio field comes
 * in plan 2b). Athletes without parental consent are filtered here already, so their data never
 * leaves Sanity; `toHomeData` filters again.
 */
export const HOME_QUERY = `{
  "settings": *[_id == "siteSettings"][0]{
    heroLines, heroText, "heroPhoto": heroPhoto${IMAGE},
    whyIntro, "whyPhoto": whyPhoto${IMAGE}, whyPoints[]{ title, text },
    hallText, "hallPhotos": hallPhotos[]${IMAGE},
    groupsIntro, trialText, rankingWeek{ week, from, to }, "venuePhoto": venuePhoto${IMAGE}
  },
  "athletes": *[_type == "athlete" && consent == true] | order(name asc){
    _id, name, "slug": slug.current, consent, frbUrl, "photo": photo${IMAGE},
    rankings[]{ category, discipline, place, points }
  },
  "groups": *[_type == "group"] | order(order asc){ _id, name, audience, track },
  "competitions": *[_type == "competition"] | order(start asc){ _id, title, city, start, end, home },
  "posts": *[_type == "post"] | order(date desc)[0...${HOME_POSTS}]{ title, "slug": slug.current, kind, date, "cover": cover${IMAGE} }
}`;

/**
 * Runs `HOME_QUERY` against the private dataset with a read token: published documents only.
 * Build-time code only; the token never goes into the page or a client bundle.
 */
export function fetchHomeQuery(config: { projectId: string; dataset: string; token: string }): Promise<unknown> {
  const client = createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    token: config.token,
    apiVersion: API_VERSION,
    useCdn: false, // builds want fresh data: the live API has what was just published, the CDN may lag
    perspective: 'published',
  });
  return client.fetch(HOME_QUERY);
}

// The shape of the GROQ result. Sanity returns null for anything unset, so every field may be null.
type Raw<T> = { [K in keyof T]?: T[K] | null };
type RawImg = Raw<Img>;
type RawRanking = Raw<{ category: string; discipline: Discipline; place: number; points: number }>;
type RawAthlete = Raw<{
  _id: string; name: string; slug: string; consent: boolean; frbUrl: string; photo: RawImg; rankings: RawRanking[];
}>;
type RawGroup = Raw<{ _id: string; name: string; audience: string; track: Group['track'] }>;
type RawCompetition = Raw<{ _id: string; title: string; city: string; start: string; end: string; home: boolean }>;
type RawPost = Raw<{ title: string; slug: string; kind: PostKind; date: string; cover: RawImg }>;
type RawSettings = Raw<{
  heroLines: string[]; heroText: string; heroPhoto: RawImg; whyIntro: string; whyPhoto: RawImg;
  whyPoints: Raw<{ title: string; text: string }>[]; hallText: string; hallPhotos: (RawImg | null)[];
  groupsIntro: string; trialText: string; rankingWeek: Raw<{ week: number; from: string; to: string }>;
  venuePhoto: RawImg; // no Studio field until plan 2b; null until then
}>;
type RawHome = Raw<{
  settings: RawSettings; athletes: RawAthlete[]; groups: RawGroup[]; competitions: RawCompetition[]; posts: RawPost[];
}>;

/** An image is usable only with a file, a real pixel size and a description; anything less is no image. */
function toImg(raw: RawImg | null | undefined): Img | undefined {
  if (!raw) return undefined;
  const { url, width, height, alt } = raw;
  if (!url || !alt?.trim() || !(typeof width === 'number' && width > 0) || !(typeof height === 'number' && height > 0)) {
    return undefined;
  }
  return { url, width, height, alt };
}

/** Keeps a key only when it has a value, so absent optional data stays absent instead of `undefined`. */
function optional<K extends string, V>(key: K, value: V | null | undefined): { [P in K]?: V } {
  return (value === null || value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

function toRanking(raw: RawRanking): Ranking {
  return {
    category: raw.category as string,
    discipline: raw.discipline as Discipline,
    place: raw.place as number,
    ...optional('points', raw.points),
  };
}

function toAthlete(raw: RawAthlete): Athlete {
  return {
    id: raw._id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    consent: raw.consent === true,
    ...optional('frbUrl', raw.frbUrl),
    ...optional('photo', toImg(raw.photo)),
    rankings: (raw.rankings ?? []).map(toRanking),
  };
}

/** Sanity groups have no slug field until plan 2b: the slug comes from the name, by the Studio's rule. */
function toGroup(raw: RawGroup): Group {
  return {
    id: raw._id as string,
    slug: slugifyRo(raw.name ?? ''),
    name: raw.name as string,
    audience: raw.audience as string,
    track: raw.track as Group['track'],
    sessions: [],
  };
}

function toCompetition(raw: RawCompetition): Competition {
  return {
    id: raw._id as string,
    title: raw.title as string,
    city: raw.city as string,
    start: raw.start as string,
    end: raw.end as string,
    home: raw.home === true,
    categories: [],
  };
}

function toPost(raw: RawPost): Post {
  return {
    title: raw.title as string, slug: raw.slug as string, kind: raw.kind as PostKind, date: raw.date as string,
    ...optional('cover', toImg(raw.cover)),
    body: [], gallery: [], results: [],
  };
}

/**
 * Maps the result of `HOME_QUERY` to `SiteData`: drops athletes without consent and broken
 * images, turns missing lists into empty ones. Fields the query does not read yet (sessions,
 * categories, bodies, coaches, club answers) take their empty defaults until plan 2b.
 * Required texts pass through as they are; `parseSiteData` in content.ts checks them.
 */
export function toHomeData(raw: unknown): SiteData {
  const home = (raw ?? {}) as RawHome;
  const s = home.settings;
  if (!s) throw new Error('Sanity: no published siteSettings document ("Pagina principală") was found.');
  const rw = s.rankingWeek;
  return {
    athletes: visibleAthletes((home.athletes ?? []).map(toAthlete)),
    ...optional('rankingWeek', rw && rw.week != null && rw.from && rw.to ? { week: rw.week, from: rw.from, to: rw.to } : undefined),
    competitions: (home.competitions ?? []).map(toCompetition),
    groups: (home.groups ?? []).map(toGroup),
    posts: (home.posts ?? []).map(toPost),
    hallPhotos: (s.hallPhotos ?? []).map(toImg).filter((img): img is Img => img !== undefined),
    heroLines: s.heroLines as string[],
    heroText: s.heroText as string,
    ...optional('heroPhoto', toImg(s.heroPhoto)),
    whyIntro: s.whyIntro as string,
    ...optional('whyPhoto', toImg(s.whyPhoto)),
    whyPoints: (s.whyPoints ?? []).map(p => ({ title: p.title as string, text: p.text as string })),
    hallText: s.hallText as string,
    groupsIntro: s.groupsIntro as string,
    trialText: s.trialText as string,
    coaches: [],
    info: { parents: {}, contact: {}, ...optional('venuePhoto', toImg(s.venuePhoto)) },
  };
}
