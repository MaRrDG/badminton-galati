export type Img = {
  url: string; width: number; height: number; alt: string;
  position?: string; // CSS object-position
  srcset?: string; // plan 2b
};
/** FRB discipline codes. The lists are the single source for both the types and the content checks. */
export const DISCIPLINES = ['SB', 'SF', 'DB', 'DF', 'DX'] as const;
export type Discipline = (typeof DISCIPLINES)[number];
export const TRACKS = ['performanta', 'amatori'] as const;
export type Track = (typeof TRACKS)[number];
export const POST_KINDS = ['competitie', 'viata-clubului', 'proiecte'] as const;
export type PostKind = (typeof POST_KINDS)[number];
/** ISO weekday, 1 = luni. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
/** Age and team categories of the FRB calendar, in display order. */
export const COMPETITION_CATEGORIES = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U23', 'Seniori', 'Echipe'] as const;
export type CompetitionCategory = (typeof COMPETITION_CATEGORIES)[number];
export type Ranking = { category: string; discipline: Discipline; place: number; points?: number };
export type RankingWeek = { week: number; from: string; to: string }; // ISO dates
export type Athlete = {
  id: string; name: string; slug: string; consent: boolean; frbUrl?: string; photo?: Img; rankings: Ranking[];
  birthYear?: number; groupId?: string;
};
export type Competition = {
  id: string; title: string; city: string; start: string; end: string; home: boolean;
  categories: CompetitionCategory[]; resultsUrl?: string;
  postSlug?: string; // derived from the newest linked post, never read from the source
};
export type Session = { day: (typeof WEEKDAYS)[number]; start: string; end: string }; // 'HH:MM', 24 h
export type Group = {
  id: string; slug: string; name: string; audience: string; track: Track; sessions: Session[]; coachId?: string;
  schedule?: string; // plan 1 field, kept until Task 8 moves the homepage to sessions, then removed
};
export type Coach = { id: string; name: string; role?: string; photo?: Img };
export type Result = { athleteId: string; discipline?: Discipline; result: string };
export type Span = { _type: 'span'; _key: string; text: string; marks?: string[] };
/** Portable Text as stored in Sanity: text blocks, plus photos placed inside the text. */
export type BodyBlock =
  | {
      _type: 'block'; _key: string; style?: 'normal' | 'h2' | 'h3' | 'blockquote'; listItem?: 'bullet' | 'number'; level?: number;
      children: Span[]; markDefs?: { _key: string; _type: 'link'; href: string }[];
    }
  | { _type: 'photo'; _key: string; photo: Img };
export type Post = {
  title: string; slug: string; kind: PostKind; date: string; cover?: Img;
  competitionId?: string; body: BodyBlock[]; gallery: Img[]; results: Result[];
};
/** The club's answers for the parents', programme and contact pages; anything unknown is left out. */
export type ClubInfo = {
  parents: { age?: string; equipment?: string; cost?: string; firstWeeks?: string; registration?: string };
  programNote?: string;
  contact: { phone?: string; directions?: string; replyDays?: number };
};
export type HomeData = {
  athletes: Athlete[]; rankingWeek?: RankingWeek; competitions: Competition[];
  groups: Group[]; posts: Post[]; hallPhotos: Img[];
  heroLines: string[]; heroText: string; heroPhoto?: Img;
  whyIntro: string; whyPhoto?: Img; whyPoints: { title: string; text: string }[]; hallText: string; groupsIntro: string; trialText: string;
};
/** Everything the site shows: the homepage content plus what only the inner pages read. */
export type SiteData = HomeData & { coaches: Coach[]; info: ClubInfo };
