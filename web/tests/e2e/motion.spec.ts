import { test, expect, type Page } from '@playwright/test';
import { pinClock } from './clock';
import { on } from './servers';

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

/** Right edge of the hall column's content box, and of the strip's last photo. */
const stripEdges = (page: Page) => page.evaluate(() => {
  const track = document.querySelector('.hall .track')!;
  const column = track.parentElement!;
  const contentRight = column.getBoundingClientRect().right - parseFloat(getComputedStyle(column).paddingRight);
  return { contentRight, lastRight: track.lastElementChild!.getBoundingClientRect().right };
});

test.describe('a hall with a single photo', on('sparse'), () => {
  test('a single photo never pins and fits its column', async ({ page }) => {
    for (const [w, h] of [[390, 844], [860, 844], [1440, 900], [1904, 950]] as const) {
      await page.setViewportSize({ width: w, height: h }); await page.goto('/', { waitUntil: 'networkidle' });
      await expect(page.locator('.hall .track figure')).toHaveCount(1);
      const top = await hallTop(page);
      await page.evaluate(y => scrollTo(0, y - 200), top); await page.waitForTimeout(500);
      const before = await page.evaluate(() => document.querySelector('.hall .track')!.getBoundingClientRect().top);
      await page.evaluate(y => scrollTo(0, y + 300), top); await page.waitForTimeout(800);
      const after = await page.evaluate(() => document.querySelector('.hall .track')!.getBoundingClientRect().top);
      // Not pinned: the strip scrolls with the page.
      expect(before - after, `${w}×${h}`).toBeCloseTo(500, 0);
      expect(await trackX(page)).toBe(0);
      await expect(page.locator('.pin-spacer .track')).toHaveCount(0);
      const { contentRight, lastRight } = await stripEdges(page);
      expect(lastRight, `${w}×${h}`).toBeLessThanOrEqual(contentRight + 0.5);
    }
  });

  test('without JavaScript the single photo stays inside its column', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false }); const page = await ctx.newPage();
    for (const w of [390, 860, 1440]) {
      await page.setViewportSize({ width: w, height: 844 }); await page.goto('/');
      const { contentRight, lastRight } = await stripEdges(page);
      expect(lastRight, `${w}`).toBeLessThanOrEqual(contentRight + 0.5);
    }
    await ctx.close();
  });
});

test.describe('a strip of landscape and portrait photos', on('mixed-strip'), () => {
  test('travels until the last photo is fully in view, or stays put when it fits', async ({ page }) => {
    for (const [w, h, travels] of [[390, 844, true], [600, 844, true], [1440, 900, false]] as const) {
      await page.setViewportSize({ width: w, height: h }); await page.goto('/', { waitUntil: 'networkidle' });
      const top = await hallTop(page);
      await page.evaluate(y => scrollTo(0, y + 6000), top); await page.waitForTimeout(1200);
      const { contentRight, lastRight } = await stripEdges(page);
      expect(lastRight, `${w}×${h}`).toBeLessThanOrEqual(contentRight + 1);
      if (travels) {
        expect(await trackX(page), `${w}×${h}`).toBeLessThan(-100);
        expect(lastRight, `${w}×${h}`).toBeGreaterThan(contentRight - 2);
      } else {
        expect(await trackX(page), `${w}×${h}`).toBe(0);
        await expect(page.locator('.pin-spacer .track')).toHaveCount(0);
      }
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

test('the strip is a keyboard stop only while it scrolls by itself', async ({ page, browser }) => {
  // With motion the page scroll moves the strip, so the strip is no tab stop of its own.
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('.hall.js-rally')).toHaveCount(1);
  await expect(page.locator('.hall .track')).not.toHaveAttribute('tabindex');
  // Without JavaScript it is a scrolling region a keyboard user must be able to reach.
  const ctx = await browser.newContext({ javaScriptEnabled: false }); const still = await ctx.newPage();
  await still.goto('/');
  await expect(still.locator('.hall .track')).toHaveAttribute('tabindex', '0');
  await ctx.close();
});

test('a hall photo arriving mid-pin does not re-lay the pinned column', async ({ page }) => {
  // Hold the hall photos until the strip is pinned, then let them load and watch the column.
  let release!: () => void;
  const gate = new Promise<void>(r => (release = r));
  await page.route(/\/img\/(meci-dublu|sala-turneu-1|echipa-rosu|festivitate|cantonament|medalii|sala-turneu-2)\.jpg$/,
    async route => { await gate; await route.continue(); });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const top = await hallTop(page);
  await page.evaluate(y => scrollTo(0, y + 300), top); await page.waitForTimeout(800);
  await expect(page.locator('.pin-spacer .track')).toHaveCount(1);
  await page.evaluate(() => {
    const w = window as unknown as { columnChanges: number };
    w.columnChanges = 0;
    new MutationObserver(list => (w.columnChanges += list.length))
      .observe(document.querySelector('.hall .wrap')!, { attributes: true, attributeFilter: ['style'] });
  });
  release();
  // Lazy photos far off to the right are not requested yet; wait for the ones that are.
  await expect.poll(() => page.locator('.hall .track img').evaluateAll(imgs => {
    const started = (imgs as HTMLImageElement[]).filter(i => i.currentSrc !== '');
    return started.length > 0 && started.every(i => i.complete && i.naturalWidth > 0);
  })).toBe(true);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { columnChanges: number }).columnChanges)).toBe(0);
});

test.describe('crossing the 860px breakpoint', () => {
  /** Waits until the hero intro has played: every line in place and fully shown. */
  const introDone = (page: Page) => expect.poll(() => page.locator('.hero h1 span').evaluateAll(spans => spans.every(s => {
    const cs = getComputedStyle(s);
    return cs.opacity === '1' && new DOMMatrix(cs.transform).m41 === 0;
  }))).toBe(true);

  test('does not replay the hero intro', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/', { waitUntil: 'networkidle' });
    await introDone(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const opacities: string[] = [];
    for (let i = 0; i < 6; i++) {
      opacities.push(await page.evaluate(() => getComputedStyle(document.querySelector('.hero .l1')!).opacity));
      await page.waitForTimeout(60);
    }
    expect(opacities).toEqual(Array(6).fill('1'));
    // Nor does it leave the first line shifted: at the top of the page the scrub has not started.
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.waitForTimeout(800); // the scrub's catch-up
    const x = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.hero .l1')!).transform).m41);
    expect(Math.abs(x)).toBeLessThan(0.5);
  });
});

test('the hero scrub follows the new width after a resize', async ({ page }) => {
  // Both widths are wide, so the same scrub must re-measure its distances on refresh.
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/', { waitUntil: 'networkidle' });
  // Scrub a little first, so the tweens have recorded their distances for 1440.
  await page.evaluate(() => scrollTo(0, 200)); await page.waitForTimeout(800);
  await page.setViewportSize({ width: 1100, height: 900 }); await page.waitForTimeout(500);
  await page.evaluate(() => scrollTo(0, 2500)); await page.waitForTimeout(1500);
  const x = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.hero .l2')!).transform).m41);
  expect(x).toBeCloseTo(1100 * 0.15, 0);
});

test('heading drift follows the new width after a resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/', { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1000, height: 900 }); await page.waitForTimeout(800);
  // At the top of the page the first section heading has not started drifting: it sits at its start offset.
  const x = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('#why-h')!).transform).m41);
  expect(x).toBeCloseTo(1000 * 0.07, 0);
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

// One server per motion path: the full page, a single hall photo with no roster and a wrapped
// hero line, and a strip that pins only when narrow. The other fixtures differ in content only.
for (const server of ['home', 'sparse', 'mixed-strip'] as const)
  test(`no page errors while scrolling: ${server}`, on(server), async ({ page }) => {
    const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto('/'); await page.mouse.wheel(0, 8000); await page.waitForTimeout(800);
    expect(errs).toEqual([]);
  });

test('motion is bundled, not loaded from another site', async ({ page, baseURL }) => {
  const foreign: string[] = [];
  page.on('request', r => { if (new URL(r.url()).origin !== new URL(baseURL!).origin) foreign.push(r.url()); });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(foreign).toEqual([]);
  // And the motion layer did run: it marks the hall whose strip it moves.
  await expect(page.locator('.hall.js-rally')).toHaveCount(1);
});
