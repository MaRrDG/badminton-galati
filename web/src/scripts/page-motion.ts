// The one motion moment of each inner page (owner's rule: at most one small load or scroll
// moment per page). A page calls initPageMotion once with its moment. Reduced motion and no-JS
// show the final state, which is the page as rendered.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export type PageMoment =
  | 'tile-roll' // /sportivi/: place digits roll when a tile enters (once)
  | 'place-roll' // /sportivi/[slug]/: the place numeral rolls on load
  | 'season-fill' // /calendar/: event blocks fill in date order on load
  | 'feature-reveal' // /noutati/: featured plate rises, photo unclips on load
  | 'cover-recrop' // /noutati/[slug]/: cover scales to 1.16 while scrolling away
  | 'sessions-settle' // /program/: blocks settle into slots once, wide only
  | 'poster-reveal'; // /pentru-parinti/, /contact/: the plated photo arrives like the homepage poster

export function initPageMotion(moment: PageMoment): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);
  switch (moment) {
    case 'poster-reveal':
      posterReveal();
      break;
    // The other moments arrive with their pages.
  }
}

/**
 * The photo marked `.plated.reveal` (PlatePhoto with class="reveal") arrives once when it
 * scrolls into view: the plate grows from the bottom, then the photo unclips upwards.
 */
function posterReveal(): void {
  const poster = document.querySelector<HTMLElement>('.plated.reveal');
  const plate = poster?.querySelector('.plate');
  const shot = poster?.querySelector('.shot');
  if (!poster || !plate || !shot) return;
  gsap
    .timeline({ defaults: { ease: 'power4.out' }, scrollTrigger: { trigger: poster, start: 'top 85%', once: true } })
    .from(plate, { scaleY: 0, duration: 0.6 })
    .from(shot, { clipPath: 'inset(100% 0 0 0)', duration: 0.85 }, '-=.35');
}
