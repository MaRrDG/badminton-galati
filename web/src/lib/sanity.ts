import { createClient } from '@sanity/client';
import { visibleAthletes } from './home';
import { HOME_POSTS } from './home';
import type { Athlete, Competition, Discipline, Group, HomeData, Img, Post, PostKind, Ranking } from './types';

const API_VERSION = '2025-02-19';

/** Projects an image field to the fields of `Img`, with the pixel size from the asset metadata. */
const IMAGE = `{ alt, "url": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height }`;

/**
 * Everything the homepage needs, in one request. Athletes without parental consent are
 * filtered here already, so their data never leaves Sanity; `toHomeData` filters again.
 */
export const HOME_QUERY = `{
  "settings": *[_id == "siteSettings"][0]{
    heroLines, heroText, "heroPhoto": heroPhoto${IMAGE},
    whyIntro, "whyPhoto": whyPhoto${IMAGE}, whyPoints[]{ title, text },
    hallText, "hallPhotos": hallPhotos[]${IMAGE},
    groupsIntro, trialText, rankingWeek{ week, from, to }
  },
  "athletes": *[_type == "athlete" && consent == true] | order(name asc){
    _id, name, "slug": slug.current, consent, frbUrl, "photo": photo${IMAGE},
    rankings[]{ category, discipline, place, points }
  },
  "groups": *[_type == "group"] | order(order asc){ name, audience, track, schedule },
  "competitions": *[_type == "competition"] | order(start asc){
    _id, title, city, start, end, home, "postSlug": post->slug.current
  },
  "posts": *[_type == "post"] | order(date desc)[0...${HOME_POSTS}]{ title, "slug": slug.current, kind, date, "cover": cover${IMAGE} }
}`;

/** Runs `HOME_QUERY` against the public, read-only dataset: published documents only, no token. */
export function fetchHomeQuery(config: { projectId: string; dataset: string }): Promise<unknown> {
  const client = createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: API_VERSION,
    useCdn: false, // builds want the version just published, not a cached one
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
type RawGroup = Raw<Group>;
type RawCompetition = Raw<{ _id: string; title: string; city: string; start: string; end: string; home: boolean; postSlug: string }>;
type RawPost = Raw<{ title: string; slug: string; kind: PostKind; date: string; cover: RawImg }>;
type RawSettings = Raw<{
  heroLines: string[]; heroText: string; heroPhoto: RawImg; whyIntro: string; whyPhoto: RawImg;
  whyPoints: Raw<{ title: string; text: string }>[]; hallText: string; hallPhotos: (RawImg | null)[];
  groupsIntro: string; trialText: string; rankingWeek: Raw<{ week: number; from: string; to: string }>;
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

function toGroup(raw: RawGroup): Group {
  return { name: raw.name as string, audience: raw.audience as string, track: raw.track as Group['track'], ...optional('schedule', raw.schedule) };
}

function toCompetition(raw: RawCompetition): Competition {
  return {
    id: raw._id as string,
    title: raw.title as string,
    city: raw.city as string,
    start: raw.start as string,
    end: raw.end as string,
    home: raw.home === true,
    ...optional('postSlug', raw.postSlug),
  };
}

function toPost(raw: RawPost): Post {
  return { title: raw.title as string, slug: raw.slug as string, kind: raw.kind as PostKind, date: raw.date as string, ...optional('cover', toImg(raw.cover)) };
}

/**
 * Maps the result of `HOME_QUERY` to `HomeData`: drops athletes without consent and broken
 * images, turns missing lists into empty ones. Required texts pass through as they are;
 * `parseHomeData` in content.ts checks them.
 */
export function toHomeData(raw: unknown): HomeData {
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
  };
}
