export type Img = { url: string; width: number; height: number; alt: string };
/** FRB discipline codes. The lists are the single source for both the types and the content checks. */
export const DISCIPLINES = ['SB', 'SF', 'DB', 'DF', 'DX'] as const;
export type Discipline = (typeof DISCIPLINES)[number];
export const TRACKS = ['performanta', 'amatori'] as const;
export type Track = (typeof TRACKS)[number];
export const POST_KINDS = ['competitie', 'viata-clubului', 'proiecte'] as const;
export type PostKind = (typeof POST_KINDS)[number];
export type Ranking = { category: string; discipline: Discipline; place: number; points?: number };
export type RankingWeek = { week: number; from: string; to: string }; // ISO dates
export type Athlete = { id: string; name: string; slug: string; consent: boolean; frbUrl?: string; photo?: Img; rankings: Ranking[] };
export type Competition = { id: string; title: string; city: string; start: string; end: string; home: boolean; postSlug?: string };
export type Group = { name: string; audience: string; track: Track; schedule?: string };
export type Post = { title: string; slug: string; kind: PostKind; date: string; cover?: Img };
export type HomeData = {
  athletes: Athlete[]; rankingWeek?: RankingWeek; competitions: Competition[];
  groups: Group[]; posts: Post[]; hallPhotos: Img[];
  heroLines: string[]; heroText: string; heroPhoto?: Img;
  whyIntro: string; whyPhoto?: Img; whyPoints: { title: string; text: string }[]; hallText: string; groupsIntro: string; trialText: string;
};
