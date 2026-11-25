// The moments of the inner pages, with GSAP. Loaded by page-motion.ts only when the moment
// will run (motion allowed, its targets on the page), so no other visit downloads GSAP.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { PageMoment } from './page-motion';
import { digitBands } from './roll';

/**
 * `intro: false` means the code arrived late (`lib/motion-budget.ts`): the moments that play on
 * load (place-roll, season-fill, feature-reveal) are skipped, and so are the once-on-scroll
 * reveals whose target is already in view (it would snap back and replay). Scroll-driven
 * moments run as usual.
 */
export function runPageMoment(moment: PageMoment, { intro = true }: { intro?: boolean } = {}): void {
  gsap.registerPlugin(ScrollTrigger);
  switch (moment) {
    case 'tile-roll':
      tileRoll(intro);
      break;
    case 'place-roll':
      if (intro) placeRoll();
      break;
    case 'season-fill':
      if (intro) seasonFill();
      break;
    case 'poster-reveal':
      if (intro || !inView('.plated.reveal', 0.85)) posterReveal();
      break;
    case 'feature-reveal':
      if (intro) featureReveal();
      break;
    case 'cover-recrop':
      coverRecrop();
      break;
    case 'sessions-settle':
      if (intro || !inView('.planner', 0.8)) sessionsSettle();
      break;
  }
}

/** Whether the top of `selector` is above `start` of the window (the trigger's `top N%`), so its scroll reveal would fire at once. */
function inView(selector: string, start: number): boolean {
  const el = document.querySelector(selector);
  return !!el && el.getBoundingClientRect().top < innerHeight * start;
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
 * The article's cover (`.cover img`) re-crops slowly as it scrolls away: it scales to 1.16
 * from when its top meets the top of the viewport until its bottom does, scrubbed (0.6 s), as
 * the homepage hero scrub without a pin. The frame clips it, so the layout never moves; an
 * article without a cover has nothing to move.
 */
function coverRecrop(): void {
  const cover = document.querySelector<HTMLElement>('.cover');
  const img = cover?.querySelector('img');
  if (!cover || !img) return;
  gsap.to(img, { scale: 1.16, ease: 'none', scrollTrigger: { trigger: cover, start: 'top top', end: 'bottom top', scrub: 0.6 } });
}

/**
 * The session blocks of the programme (`.planner .blk`) settle into their time slots, growing
 * down from their start, one after the other, once when the planner comes into view. Wide
 * screens only: on phones the days are a plain list. The blocks end as rendered.
 */
function sessionsSettle(): void {
  if (!document.querySelector('.planner .blk')) return;
  gsap.matchMedia().add('(min-width: 861px)', () => {
    gsap.from('.planner .blk', {
      scaleY: 0,
      transformOrigin: '50% 0',
      duration: 0.55,
      ease: 'power3.out',
      stagger: 0.035,
      clearProps: 'transform',
      scrollTrigger: { trigger: '.planner', start: 'top 80%', once: true },
    });
  });
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
 * With `intro` false (late code) the tiles already in view keep their final digits.
 */
function tileRoll(intro: boolean): void {
  gsap.utils.toArray<HTMLElement>('.wall [data-roll]').forEach(el => {
    const place = el.dataset.roll ?? '';
    const bands = digitBands(el);
    for (const cell of el.children) cell.setAttribute('aria-hidden', 'true');
    const spoken = document.createElement('span');
    spoken.className = 'visually-hidden';
    spoken.textContent = place;
    el.append(spoken);
    for (const { band, end } of bands) gsap.set(band, { yPercent: end });
    if (!intro && el.getBoundingClientRect().top < innerHeight * 0.92) return;
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
