import { test, expect, type Page } from '@playwright/test';
import { pinClock } from './clock';
import { on } from './servers';

// GSAP runs on Date.now, so the clock is pinned but keeps running (see pinClock).
test.beforeEach(async ({ page }) => {
  await pinClock(page);
});

/** Every hero line and section heading that is on screen but whose text runs off a side. */
const offScreenText = (page: Page) => page.evaluate(() => [...document.querySelectorAll('.hero h1 span, main h2.display')].flatMap(e => {
  const range = document.createRange();
  range.selectNodeContents(e);
  const r = range.getBoundingClientRect();
  const onScreen = r.bottom > 0 && r.top < innerHeight;
  return onScreen && (r.left < -0.5 || r.right > innerWidth + 0.5)
    ? [`${e.textContent!.trim()}: ${Math.round(r.left)}..${Math.round(r.right)}`] : [];
}));

/**
 * Resolves once no hero line or heading has moved for five frames: the scrub has caught up
 * with the scroll (scrub 0.6s at most).
 */
const settled = (page: Page) => page.evaluate(() => new Promise<void>(resolve => {
  const els = [...document.querySelectorAll('.hero h1 span, main h2.display')];
  const read = () => els.map(e => getComputedStyle(e).transform).join();
  let last = read(), still = 0;
  const deadline = performance.now() + 1500;
  const frame = () => {
    const now = read();
    still = now === last ? still + 1 : 0;
    last = now;
    if (still >= 5 || performance.now() > deadline) resolve(); else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}));

/**
 * The scroll positions where a text box reaches its extremes (motion.ts): the hero scrub's
 * start, middle and end, and with `headings` for each section heading the start of its drift
 * (just fully on screen at the bottom, offset almost in full) and its end (top at 35%, offset
 * gone). Narrow screens scrub from the hero's top at the top to its bottom at 35%; wide ones
 * pin the hero for 70% of a viewport. Each heading position names its heading, which must be
 * on screen there, so a layout change cannot make the scan skip it.
 */
const positions = (page: Page, headings: boolean) => page.evaluate(headings => {
  const top = (e: Element) => e.getBoundingClientRect().top + scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  const at = (y: number) => Math.round(Math.min(max, Math.max(0, y)));
  const hero = document.querySelector('.hero')!;
  const wide = matchMedia('(min-width: 861px)').matches;
  const heroStart = top(hero);
  const heroEnd = wide ? heroStart + 0.7 * innerHeight : heroStart + hero.getBoundingClientRect().height - 0.35 * innerHeight;
  const list: { y: number; label: string; heading?: number }[] = [
    { y: at(heroStart), label: 'hero scrub start' },
    { y: at((heroStart + heroEnd) / 2), label: 'hero scrub middle' },
    { y: at(heroEnd), label: 'hero scrub end' },
  ];
  if (headings) document.querySelectorAll('section:not(.hero) h2.display').forEach((h, i) => {
    const t = top(h), height = h.getBoundingClientRect().height;
    (h as HTMLElement).dataset.scan = String(i);
    list.push({ y: at(t - innerHeight + height + 1), label: `${h.textContent!.trim()} drift start`, heading: i });
    list.push({ y: at(t - 0.35 * innerHeight), label: `${h.textContent!.trim()} drift end`, heading: i });
  });
  return list.sort((a, b) => a.y - b.y);
}, headings);

/** Loads the page at `w`×`h`, waits for the hero intro, then checks every position. */
async function scan(page: Page, w: number, h: number, headings: boolean, name: string) {
  await page.setViewportSize({ width: w, height: h }); await page.goto('/', { waitUntil: 'networkidle' });
  // The hero intro: every line in place and fully shown.
  await expect.poll(() => page.locator('.hero h1 span').evaluateAll(spans => spans.every(s => {
    const cs = getComputedStyle(s);
    return cs.opacity === '1' && new DOMMatrix(cs.transform).isIdentity;
  }))).toBe(true);
  const list = await positions(page, headings);
  expect(list.length).toBeGreaterThan(headings ? 3 + 2 * 4 : 2);
  for (const { y, label, heading } of list) {
    await page.evaluate(v => scrollTo(0, v), y);
    await settled(page);
    if (heading !== undefined) {
      const box = await page.locator(`[data-scan="${heading}"]`).boundingBox();
      expect(box!.y + box!.height > 0 && box!.y < h, `${label} is on screen at y=${y}`).toBe(true);
    }
    expect(await offScreenText(page), `${name} ${w}×${h} at ${label} (y=${y})`).toEqual([]);
  }
}

// Sections clip sideways overflow, so a scrollWidth check could never fail; measure the text
// itself. Narrow screens have the least room: every position, on the full page and on the
// long hero line.
for (const server of ['home', 'sparse'] as const)
  test(`hero lines and headings stay on screen while scrolling: ${server} at 390`, on(server), async ({ page }) => {
    await scan(page, 390, 844, true, server);
  });

// Wide screens: headings drift at most 90px on a wide column, but the hero's second line
// slides 15% of the width while the hero is pinned.
test('hero lines stay on screen through the scrub: home at 1440', async ({ page }) => {
  await scan(page, 1440, 900, false, 'home');
  // The scan ends at the scrub's end: the second line has slid its full 15%, so it was measured.
  const x = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.hero .l2')!).transform).m41);
  expect(x).toBeCloseTo(1440 * 0.15, 0);
});
