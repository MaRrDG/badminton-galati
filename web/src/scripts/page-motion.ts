// The one motion moment of each inner page (owner's rule: at most one small load or scroll
// moment per page). A page calls initPageMotion once with its moment. Reduced motion and no-JS
// show the final state, which is the page as rendered. GSAP and the moments (page-moments.ts)
// are fetched only when the moment will run: motion allowed and its targets on the page.

import { introOnTime } from '../lib/motion-budget';

export type PageMoment =
  | 'tile-roll' // /sportivi/: place digits roll when a tile enters (once)
  | 'place-roll' // /sportivi/[slug]/: the place numeral rolls on load
  | 'season-fill' // /calendar/: event blocks fill in date order on load
  | 'feature-reveal' // /noutati/: featured plate rises, photo unclips on load
  | 'cover-recrop' // /noutati/[slug]/: cover scales to 1.16 while scrolling away
  | 'sessions-settle' // /program/: blocks settle into slots once, wide only
  | 'poster-reveal'; // /pentru-parinti/, /contact/: the plated photo arrives like the homepage poster

/** What each moment moves; without it on the page the moment has nothing to do. */
const TARGETS: Record<PageMoment, string> = {
  'tile-roll': '.wall [data-roll]',
  'place-roll': '.standing [data-roll]',
  'season-fill': '.months .evb',
  'feature-reveal': '.feat .plated .shot',
  'cover-recrop': '.cover img',
  'sessions-settle': '.planner .blk',
  'poster-reveal': '.plated.reveal .shot',
};

export function initPageMotion(moment: PageMoment): void {
  const startedAt = performance.now();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!document.querySelector(TARGETS[moment])) return;
  // Late code (a slow connection) skips the load-time intros: the page has painted its final state.
  // Measured from the first contentful paint when the browser reports it: that is when the final state shows.
  void import('./page-moments').then(m => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
    m.runPageMoment(moment, { intro: introOnTime(fcp ?? startedAt, performance.now()) });
  });
}
