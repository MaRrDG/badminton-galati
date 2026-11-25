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

test.describe('the hero on a large screen (2560×1300)', () => {
  /** The visible hero (under the header), its content block and the space above and below it. */
  const heroLayout = (page: Page) => page.evaluate(() => {
    const hero = document.querySelector('.hero')!.getBoundingClientRect();
    const parts = [document.querySelector('.hero .wrap > div')!, document.querySelector('.hero .poster')!].map(e => e.getBoundingClientRect());
    const top = Math.min(...parts.map(r => r.top)), bottom = Math.max(...parts.map(r => r.bottom));
    return { height: hero.height, above: top - hero.top, below: innerHeight - bottom, innerHeight };
  });

  test('the first screen is one composition and the scrub ends into the next section', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1300 }); await page.goto('/', { waitUntil: 'networkidle' });
    const first = await heroLayout(page);
    expect(first.above).toBeGreaterThan(0);
    expect(first.below, JSON.stringify(first)).toBeLessThanOrEqual(first.above * 1.6);
    // The hero is the window under the header plus the pin distance (70% of the window), no more.
    expect(first.height).toBeLessThanOrEqual(first.innerHeight * 1.7 + 1);
    // At the end of the pin the lines have moved their full distance and the next section's
    // content has not come into view yet.
    const end = await page.evaluate(() => document.querySelector('.hero')!.getBoundingClientRect().top + scrollY + innerHeight * 0.7);
    await page.evaluate(y => scrollTo(0, y), end); await page.waitForTimeout(1500);
    const x = (sel: string) => page.evaluate(s => new DOMMatrix(getComputedStyle(document.querySelector(s)!).transform).m41, sel);
    expect(await x('.hero .l2')).toBeCloseTo(2560 * 0.15, 0);
    expect(await x('.hero .l1')).toBeCloseTo(2560 * -0.05, 0);
    expect(await page.evaluate(() => document.querySelector('#why-h')!.getBoundingClientRect().top)).toBeGreaterThan(1300);
  });

  for (const mode of ['reduced motion', 'no JavaScript'] as const)
    test(`with ${mode} the hero is one balanced screen, not a pin's height`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 2560, height: 1300 },
        ...(mode === 'reduced motion' ? { reducedMotion: 'reduce' as const } : { javaScriptEnabled: false }) });
      const page = await ctx.newPage();
      await page.goto('/');
      const l = await heroLayout(page);
      await expect(page.locator('.pin-spacer')).toHaveCount(0);
      expect(l.height).toBeLessThanOrEqual(l.innerHeight);
      expect(l.below, JSON.stringify(l)).toBeLessThanOrEqual(l.above * 1.6);
      await ctx.close();
    });
});

test.describe('motion code that arrives late', () => {
  /**
   * Records the lowest opacity the hero headline lines reach once the page has painted: on every
   * frame and on every style change of a line.
   */
  const watchHeadline = (page: Page) => page.addInitScript(() => {
    const w = window as unknown as { minOpacity: number };
    w.minOpacity = 1;
    const lines = () => document.querySelectorAll<HTMLElement>('.hero .l1, .hero .l2, .hero .l3');
    const sample = () => lines().forEach(l => { w.minOpacity = Math.min(w.minOpacity, parseFloat(getComputedStyle(l).opacity)); });
    const frame = () => { sample(); requestAnimationFrame(frame); };
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(sample).observe(document.querySelector('.hero')!, { attributes: true, attributeFilter: ['style'], subtree: true });
      requestAnimationFrame(frame);
    });
  });
  const minOpacity = (page: Page) => page.evaluate(() => (window as unknown as { minOpacity: number }).minOpacity);

  test('on time, the hero intro plays (the probe sees the lines come in)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await watchHeadline(page);
    await page.goto('/');
    await expect.poll(() => minOpacity(page)).toBeLessThan(0.5);
  });

  test('1.5 s late, the headline never fades out after the first paint; the scrub is still set up', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await watchHeadline(page);
    let arrived = false;
    await page.route(/\/_astro\/motion\.[^/]*\.js$/, async route => {
      await new Promise(r => setTimeout(r, 1500));
      await route.continue();
      arrived = true;
    });
    await page.goto('/');
    await expect.poll(() => arrived, { timeout: 5000 }).toBe(true);
    // The scroll moments run: the hero column is pinned (a pin spacer wraps it).
    await expect(page.locator('.hero .pin-spacer')).toHaveCount(1);
    await page.waitForTimeout(1200);
    expect(await minOpacity(page)).toBe(1);
  });
});

test.describe('inner-page moment code that arrives late', () => {
  /**
   * Records, on every frame, whether the first wall tile's digit band was ever back near its start
   * (within a tenth of its height of the cell's top; a frame after the roll starts it has moved a
   * few percent) and whether the contact poster was ever clipped or its plate shrunk.
   */
  const watchMoments = (page: Page) => page.addInitScript(() => {
    const w = window as unknown as { bandAtStart: boolean; posterHidden: boolean };
    w.bandAtStart = false;
    w.posterHidden = false;
    const frame = () => {
      const band = document.querySelector<HTMLElement>('.wall [data-roll] i span');
      if (band) {
        const r = band.getBoundingClientRect();
        if (r.top - band.parentElement!.getBoundingClientRect().top > -0.1 * r.height) w.bandAtStart = true;
      }
      const shot = document.querySelector<HTMLElement>('.plated.reveal .shot');
      const plate = document.querySelector<HTMLElement>('.plated.reveal .plate');
      if (shot && /inset\((?!0px 0px 0px 0px|0%)/.test(shot.style.clipPath)) w.posterHidden = true;
      if (plate && plate.style.transform && new DOMMatrix(getComputedStyle(plate).transform).d < 0.99) w.posterHidden = true;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const seen = (page: Page) =>
    page.evaluate(() => { const w = window as unknown as { bandAtStart: boolean; posterHidden: boolean }; return { band: w.bandAtStart, poster: w.posterHidden }; });

  /** Delays the inner pages' moment chunk by `ms`; resolves `arrived` once it is served. */
  const delayMoments = async (page: Page, ms: number) => {
    const state = { arrived: false };
    await page.route(/\/_astro\/page-moments\.[^/]*\.js$/, async route => {
      await new Promise(r => setTimeout(r, ms));
      await route.continue();
      state.arrived = true;
    });
    return state;
  };

  for (const [path, key] of [['/sportivi/', 'band'], ['/contact/', 'poster']] as const) {
    test(`on time, ${path} plays its moment (the probe sees it start)`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await watchMoments(page);
      await page.goto(path);
      await expect.poll(async () => (await seen(page))[key]).toBe(true);
    });

    test(`1.5 s late, ${path} keeps what it painted`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await watchMoments(page);
      const state = await delayMoments(page, 1500);
      await page.goto(path);
      await expect.poll(() => state.arrived, { timeout: 5000 }).toBe(true);
      if (key === 'band') await expect(page.locator('.wall [data-roll] i').first()).toHaveCount(1); // the moment ran
      await page.waitForTimeout(1200);
      expect((await seen(page))[key]).toBe(false);
    });
  }
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

// Every server: the full page, a single hall photo with no roster and a wrapped hero line, a
// strip that pins only when narrow, and a roster without rank numerals beside a calendar
// without countdown (two scripts with nothing to animate).
for (const server of ['home', 'sparse', 'mixed-strip', 'quiet-season'] as const)
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

// GSAP is fetched only when motion will run: under reduced motion the homepage and an inner
// page request no script holding it; with motion they do (so the marker is a real one). A fresh
// context per visit, so nothing comes from the cache.
test('GSAP is loaded only when motion runs', async ({ browser, baseURL }) => {
  const MARK = 'GreenSockGlobals';
  for (const reducedMotion of ['reduce', 'no-preference'] as const)
    for (const path of ['/', '/noutati/']) {
      const ctx = await browser.newContext({ baseURL, reducedMotion });
      const page = await ctx.newPage();
      const bodies: Promise<string>[] = [];
      page.on('response', r => { if (r.request().resourceType() === 'script' && r.status() === 200) bodies.push(r.text()); });
      await page.goto(path, { waitUntil: 'networkidle' });
      const withGsap = (await Promise.all(bodies)).some(b => b.includes(MARK));
      expect(withGsap, `${path}, ${reducedMotion}`).toBe(reducedMotion === 'no-preference');
      await ctx.close();
    }
});
