// The parents' page (/pentru-parinti/): the club's answers, the coaches and the two photos.
// Everything here is pure; the site data is read, never changed.
import { toneAt, type Tone } from './tiles';
import type { ClubInfo, Coach, Img, SiteData } from './types';

export type ParentsPage = {
  parents: ClubInfo['parents'];
  coaches: { coach: Coach; tone: Tone }[];
  /** `first`: the first performance group (where children start); `play`: the first amateur group. */
  groupSlugs: { first?: string; play?: string };
  /** The venue answer's photo: the club's `venuePhoto`, else the first hall photo that is not the opening one. */
  hallPhoto?: Img;
  /** The club's `parentsPhoto`, else the first hall photo. */
  openingPhoto?: Img;
};

export function parentsView(site: SiteData): ParentsPage {
  const first = site.groups.find(g => g.track === 'performanta')?.slug;
  const play = site.groups.find(g => g.track === 'amatori')?.slug;
  const openingPhoto = site.info.parentsPhoto ?? site.hallPhotos[0];
  const hallPhoto = site.info.venuePhoto ?? site.hallPhotos.find(p => p.url !== openingPhoto?.url);
  return {
    parents: site.info.parents,
    coaches: site.coaches.map((coach, i) => ({ coach, tone: toneAt(i) })),
    groupSlugs: { ...(first ? { first } : {}), ...(play ? { play } : {}) },
    ...(hallPhoto ? { hallPhoto } : {}),
    ...(openingPhoto ? { openingPhoto } : {}),
  };
}

/** The sentence before the coaches, by how many there are; no number word, so it never goes stale. */
export function coachesLead(count: number): string | undefined {
  if (count === 0) return undefined;
  return count === 1 ? 'Clubul e condus de antrenorul său.' : 'Clubul e condus de antrenorii săi.';
}

/** A club answer as paragraphs: split on blank lines, empty ones dropped. */
export function answerParagraphs(answer: string | undefined): string[] {
  if (!answer) return [];
  return answer.split(/\r?\n[ \t]*\r?\n/).map(p => p.trim()).filter(Boolean);
}
