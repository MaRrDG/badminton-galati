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
 * The scroll positions where a text box reaches its extremes (motion.ts, narrow screen): the
 * hero scrub's start, middle and end (trigger top at the top, bottom at 35%), and for each
 * section heading the start of its drift (just fully on screen at the bottom, offset almost
 * in full) and its end (top at 35%, offset gone). Each heading position names its heading,
 * which must be on screen there, so a layout change cannot make the scan skip it.
 */
const positions = (page: Page) => page.evaluate(() => {
  const top = (e: Element) => e.getBoundingClientRect().top + scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  const at = (y: number) => Math.round(Math.min(max, Math.max(0, y)));
  const hero = document.querySelector('.hero')!;
  const heroStart = top(hero), heroEnd = top(hero) + hero.getBoundingClientRect().height - 0.35 * innerHeight;
  const list: { y: number; label: string; heading?: number }[] = [
    { y: at(heroStart), label: 'hero scrub start' },
    { y: at((heroStart + heroEnd) / 2), label: 'hero scrub middle' },
    { y: at(heroEnd), label: 'hero scrub end' },
  ];
  document.querySelectorAll('section:not(.hero) h2.display').forEach((h, i) => {
    const t = top(h), height = h.getBoundingClientRect().height;
    const heading = i;
    (h as HTMLElement).dataset.scan = String(i);
    list.push({ y: at(t - innerHeight + height + 1), label: `${h.textContent!.trim()} drift start`, heading });
    list.push({ y: at(t - 0.35 * innerHeight), label: `${h.textContent!.trim()} drift end`, heading });
  });
  return list.sort((a, b) => a.y - b.y);
});

// Sections clip sideways overflow, so a scrollWidth check could never fail; measure the text
// itself. Narrow screens only: wide ones have room for every offset.
for (const server of ['home', 'sparse'] as const)
  test(`hero lines and headings stay on screen while scrolling: ${server} at 390`, on(server), async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/', { waitUntil: 'networkidle' });
    // The hero intro: every line in place and fully shown.
    await expect.poll(() => page.locator('.hero h1 span').evaluateAll(spans => spans.every(s => {
      const cs = getComputedStyle(s);
      return cs.opacity === '1' && new DOMMatrix(cs.transform).isIdentity;
    }))).toBe(true);
    const list = await positions(page);
    expect(list.length).toBeGreaterThan(3 + 2 * 4);
    for (const { y, label, heading } of list) {
      await page.evaluate(v => scrollTo(0, v), y);
      await settled(page);
      if (heading !== undefined) {
        const box = await page.locator(`[data-scan="${heading}"]`).boundingBox();
        expect(box!.y + box!.height > 0 && box!.y < 844, `${label} is on screen at y=${y}`).toBe(true);
      }
      expect(await offScreenText(page), `${server} 390×844 at ${label} (y=${y})`).toEqual([]);
    }
  });
