// Scroll motion for the homepage, ported from the <script> of mockups/varianta-d.html.
// Five moments only: hero load, hero scrub, roster numerals, heading drift, hall strip.
// The page is complete without this file; every moment no-ops when its targets are absent.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Breakpoint shared with the components' CSS (`max-width: 860px`). */
const WIDE = '(min-width: 861px)';
const NARROW = '(max-width: 860px)';

export function initMotion(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add({ wide: WIDE, narrow: NARROW }, (ctx) => {
    const wide = Boolean(ctx.conditions?.wide);
    heroLoad();
    heroScrub(wide);
    const restoreRoster = rosterRoll();
    headingDrift(wide);
    const restoreHall = hallStrip(wide, ctx);
    return () => {
      restoreRoster();
      restoreHall();
    };
  });

  // Late layout shifts (fonts, images) move every trigger.
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/** 1. Hero load: the poster arrives, headline lines come in from opposite sides. */
function heroLoad(): void {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  const plate = hero.querySelector('.poster .plate');
  const shot = hero.querySelector('.poster .shot');
  if (plate) tl.from(plate, { scaleY: 0, duration: 0.7 });
  if (shot) tl.from(shot, { clipPath: 'inset(100% 0 0 0)', duration: 0.9 }, '-=.45');
  const odd = hero.querySelectorAll('.l1, .l3');
  const even = hero.querySelectorAll('.l2');
  if (odd.length) tl.from(odd, { xPercent: -10, opacity: 0, duration: 0.9 }, '-=.8');
  if (even.length) tl.from(even, { xPercent: 12, opacity: 0, duration: 0.9 }, '-=.8');
}

/**
 * 2. Hero scrub: lines slide apart, the poster grows and re-crops. Wide screens pin the hero for
 * 70% of a viewport; narrow screens scrub while the hero scrolls away.
 * The inner column is pinned, not the section, so sections stay direct children of <main>.
 */
function heroScrub(wide: boolean): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  const column = hero?.querySelector<HTMLElement>(':scope > .wrap');
  if (!hero || !column) return;
  const tl = gsap.timeline({
    scrollTrigger: wide
      ? { trigger: hero, pin: column, start: 'top top', end: '+=70%', scrub: 0.6, anticipatePin: 1 }
      : { trigger: hero, start: 'top top', end: 'bottom 35%', scrub: 0.6 },
  });
  const slide = (selector: string, share: number) => {
    const els = hero.querySelectorAll(selector);
    if (els.length) tl.to(els, { x: () => innerWidth * share, ease: 'none' }, 0);
  };
  slide('.l1', wide ? -0.05 : -0.08);
  slide('.l3', wide ? -0.03 : -0.05);
  slide('.l2', wide ? 0.15 : 0.14);
  const poster = hero.querySelector('.poster');
  const img = hero.querySelector('.poster img');
  if (poster) tl.to(poster, { scale: wide ? 1.07 : 1.04, ease: 'none' }, 0);
  if (img) tl.to(img, { scale: 1.4, ease: 'none' }, 0);
}

/**
 * 3. Roster: each rank numeral rolls through the digits to its place while the row scrolls in.
 * The element keeps its final digits as text until here, for no-JS and reduced motion.
 * Returns a function that puts the plain digits back.
 */
function rosterRoll(): () => void {
  const els = gsap.utils.toArray<HTMLElement>('[data-roll]');
  els.forEach((el) => {
    const digits = el.dataset.roll ?? '';
    el.textContent = '';
    [...digits].forEach((digit, i) => {
      // One full turn of 0–9, then on to the digit.
      const n = 10 + Number(digit) + 1;
      const cell = document.createElement('i');
      const band = document.createElement('span');
      band.style.display = 'block';
      for (let k = 0; k < n; k++) {
        const u = document.createElement('u');
        u.textContent = String(k % 10);
        band.append(u);
      }
      cell.append(band);
      el.append(cell);
      gsap.fromTo(
        band,
        { yPercent: 0 },
        {
          yPercent: (-100 * (n - 1)) / n,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 95%', end: `top ${52 - i * 8}%`, scrub: 0.6 },
        },
      );
    });
  });
  return () => els.forEach((el) => (el.textContent = el.dataset.roll ?? ''));
}

/** 4. Section headings drift sideways into place with scroll, alternating direction. */
function headingDrift(wide: boolean): void {
  gsap.utils.toArray<HTMLElement>('section:not(.hero) h2.display').forEach((h, i) => {
    const amount = (wide ? Math.min(innerWidth * 0.07, 90) : 12) * (i % 2 ? -1 : 1);
    gsap.fromTo(
      h,
      { x: amount },
      { x: 0, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'top 35%', scrub: 0.6 } },
    );
  });
}

/**
 * 5. Hall: the photo strip travels sideways while its column is pinned, until the last photo's
 * right edge meets the column's. A strip that already fits is not pinned at all. The distance
 * is re-measured on every refresh (resize, and each strip image load), and the pin is created
 * or removed when the strip starts or stops overflowing.
 * Returns a function that undoes it.
 */
function hallStrip(wide: boolean, ctx: gsap.Context): () => void {
  const hall = document.querySelector<HTMLElement>('.hall');
  const track = hall?.querySelector<HTMLElement>('.track');
  const column = track?.parentElement;
  if (!hall || !track || !column) return () => {};
  hall.classList.add('js-rally');

  const distance = () => {
    const cs = getComputedStyle(column);
    const visible = column.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.max(0, track.scrollWidth - visible);
  };

  let tween: gsap.core.Tween | undefined;
  const sync = () => {
    const travels = distance() > 0;
    if (travels === Boolean(tween)) return false;
    if (tween) {
      tween.scrollTrigger?.kill(true);
      tween.kill();
      tween = undefined;
      gsap.set(track, { clearProps: 'transform' });
    } else {
      ctx.add(() => {
        tween = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: column,
            pin: column,
            start: 'center center',
            end: () => `+=${distance() * (wide ? 1 : 0.5)}`,
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });
      });
    }
    return true;
  };

  sync();
  // Each refresh re-measures; if the strip started or stopped overflowing, rebuild and refresh again.
  const onRefresh = () => {
    if (sync()) ScrollTrigger.refresh();
  };
  ScrollTrigger.addEventListener('refresh', onRefresh);
  const onImageLoad = () => ScrollTrigger.refresh();
  const pending = [...track.querySelectorAll('img')].filter((img) => !img.complete);
  pending.forEach((img) => img.addEventListener('load', onImageLoad, { once: true }));

  return () => {
    ScrollTrigger.removeEventListener('refresh', onRefresh);
    pending.forEach((img) => img.removeEventListener('load', onImageLoad));
    hall.classList.remove('js-rally');
  };
}
