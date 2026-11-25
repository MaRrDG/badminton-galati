import { test, expect, type Page } from '@playwright/test';
import { pinClock } from './clock';
import { serverURL } from './servers';

// GSAP runs on Date.now, so the clock is pinned but keeps running (see pinClock).
test.beforeEach(async ({ page }) => {
  await pinClock(page);
});

/** Document y of the top of `.hall`. */
const hallTop = (page: Page) =>
  page.evaluate(() => document.querySelector('.hall')!.getBoundingClientRect().top + scrollY);

/** Horizontal offset of the photo strip's transform (0 when it has none). */
const trackX = (page: Page) =>
  page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.hall .track')!).transform).m41);

test('photo strip travels until the last photo is fully in view', async ({ page }) => {
  for (const [w, h] of [[1904, 950], [1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h }); await page.goto('/', { waitUntil: 'networkidle' });
    const top = await hallTop(page);
    await page.evaluate(y => scrollTo(0, y - 200), top); await page.waitForTimeout(800);
    const startX = await trackX(page);
    await page.evaluate(y => scrollTo(0, y + 6000), top); await page.waitForTimeout(1200);
    const end = await page.evaluate(() => { const t = document.querySelector('.hall .track')!;
      return { x: new DOMMatrix(getComputedStyle(t).transform).m41, right: t.lastElementChild!.getBoundingClientRect().right }; });
    expect(end.x, `${w}×${h}`).toBeLessThan(startX - 500);
    expect(end.right, `${w}×${h}`).toBeLessThanOrEqual(w + 1);
  }
});

test.describe('a hall with a single photo', () => {
  test.use({ baseURL: serverURL('one-photo') });

  test('a strip with a single photo does not pin', async ({ page }) => {
    // At these widths the one photo fits the column, so there is no distance to travel.
    for (const [w, h] of [[1904, 950], [1440, 900]] as const) {
      await page.setViewportSize({ width: w, height: h }); await page.goto('/', { waitUntil: 'networkidle' });
      await expect(page.locator('.hall .track figure')).toHaveCount(1);
      const top = await hallTop(page);
      await page.evaluate(y => scrollTo(0, y - 200), top); await page.waitForTimeout(500);
      const before = await page.evaluate(() => document.querySelector('.hall .track')!.getBoundingClientRect().top);
      await page.evaluate(y => scrollTo(0, y + 300), top); await page.waitForTimeout(800);
      const after = await page.evaluate(() => document.querySelector('.hall .track')!.getBoundingClientRect().top);
      expect(before - after, `${w}×${h}`).toBeCloseTo(500, 0);
      expect(await trackX(page)).toBe(0);
      await expect(page.locator('.pin-spacer .track')).toHaveCount(0);
    }
  });

  test('the strip pins once a resize makes it overflow, and unpins when it fits again', async ({ page }) => {
    // Both sizes are narrow, so only the re-measure on resize can change the pin.
    await page.setViewportSize({ width: 860, height: 844 }); await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('.pin-spacer .track')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.pin-spacer .track')).toHaveCount(1);
    await page.setViewportSize({ width: 860, height: 844 });
    await expect(page.locator('.pin-spacer .track')).toHaveCount(0);
    expect(await trackX(page)).toBe(0);
  });
});

test('reduced motion shows final states', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' }); const page = await ctx.newPage();
  await pinClock(page);
  await page.goto('/');
  await expect(page.locator('#sportivi [data-roll]').first()).toHaveText('2');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.l1')!).transform)).toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await ctx.close();
});

test('motion never causes horizontal overflow mid-scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(150);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); }
});

test('no page errors', async ({ page }) => { const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('/'); await page.mouse.wheel(0, 8000); await page.waitForTimeout(800); expect(errs).toEqual([]); });

test('motion is bundled, not loaded from another site', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', r => { if (new URL(r.url()).origin !== new URL(serverURL('home')).origin) foreign.push(r.url()); });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(foreign).toEqual([]);
  // And the motion layer did run: it marks the hall whose strip it moves.
  await expect(page.locator('.hall.js-rally')).toHaveCount(1);
});
