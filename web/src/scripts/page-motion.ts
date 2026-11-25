// The one motion moment of each inner page (owner's rule: at most one small load or scroll
// moment per page). A page calls initPageMotion once with its moment. Reduced motion and no-JS
// show the final state, which is the page as rendered.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { digitBands } from './roll';

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
    case 'tile-roll':
      tileRoll();
      break;
    case 'place-roll':
      placeRoll();
      break;
    case 'season-fill':
      seasonFill();
      break;
    case 'poster-reveal':
      posterReveal();
      break;
    case 'feature-reveal':
      featureReveal();
      break;
    // The other moments arrive with their pages.
  }
}

/**
 * The competition blocks of the calendar (`.months .evb`) fill in from the left, one after the
 * other in date order, 0.2 s after load, so the season's shape draws itself. The clip is
 * removed at the end, so the blocks and their focus rings end as rendered.
 */
function seasonFill(): void {
  const blocks = gsap.utils.toArray<HTMLElement>('.months .evb');
  if (blocks.length === 0) return;
  gsap.fromTo(
    blocks,
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'power3.out', stagger: 0.07, delay: 0.2, clearProps: 'clipPath' },
  );
}

/**
 * The featured article of the news page (`.feat .plated`) arrives on load, as the homepage
 * poster does: the red plate grows from the bottom, then the photo unclips upwards. A featured
 * article without a photo has no plate, and nothing moves. Both end as rendered.
 */
function featureReveal(): void {
  const plate = document.querySelector('.feat .plated .plate');
  const shot = document.querySelector('.feat .plated .shot');
  if (!plate || !shot) return;
  gsap
    .timeline({ defaults: { ease: 'power4.out' } })
    .from(plate, { scaleY: 0, duration: 0.7, clearProps: 'transform' })
    .from(shot, { clipPath: 'inset(100% 0 0 0)', duration: 0.9, clearProps: 'clipPath' }, '-=.45');
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

/**
 * The place numeral of an athlete profile (`.standing [data-roll]`) rolls through the digits
 * to the place once, 0.3 s after load. The numeral is hidden from screen readers (the lead
 * next to it says "Locul 2 în țară"), so the band needs no spoken copy.
 */
function placeRoll(): void {
  const el = document.querySelector<HTMLElement>('.standing [data-roll]');
  if (!el) return;
  digitBands(el).forEach(({ band, end }, i) =>
    gsap.fromTo(band, { yPercent: 0 }, { yPercent: end, duration: 1.3 + i * 0.25, delay: 0.3, ease: 'power3.out' }),
  );
}

/**
 * The place on each athlete tile (`.wall [data-roll]`) rolls through the digits to the number
 * once, when the tile comes into view. The bands start on the final digits, so a tile that
 * never scrolls into view still reads right. Screen readers hear the place from a hidden copy
 * of the digits, not the band. Under reduced motion none of this runs, the filter included.
 */
function tileRoll(): void {
  gsap.utils.toArray<HTMLElement>('.wall [data-roll]').forEach(el => {
    const place = el.dataset.roll ?? '';
    const bands = digitBands(el);
    for (const cell of el.children) cell.setAttribute('aria-hidden', 'true');
    const spoken = document.createElement('span');
    spoken.className = 'visually-hidden';
    spoken.textContent = place;
    el.append(spoken);
    for (const { band, end } of bands) gsap.set(band, { yPercent: end });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () =>
        bands.forEach(({ band, end }, i) =>
          gsap.fromTo(band, { yPercent: 0 }, { yPercent: end, duration: 1 + i * 0.25, ease: 'power3.out' }),
        ),
    });
  });
  // The category filter moves tiles; measure again so a place rolls when its tile enters view.
  document.querySelectorAll('input[name="cat"]').forEach(input => input.addEventListener('change', () => ScrollTrigger.refresh()));
}
