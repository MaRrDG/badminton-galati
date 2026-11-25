import { test, expect } from '@playwright/test';
import { pinClock } from './clock';
import { on } from './servers';

// The countdown reads the browser clock: every page runs on the pinned build date.
test.beforeEach(async ({ page }) => {
  await pinClock(page);
});

const block = (title: string) => `.evb[aria-label^="${title},"]`;

test('twelve month grids, today marked, the next event in the panel', async ({ page }) => {
  await page.goto('/calendar/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calendar competițional 2026');
  await expect(page.locator('.mo')).toHaveCount(12);
  await expect(page.locator('.evb')).toHaveCount(12);
  await expect(page.locator('[aria-current="date"]')).toHaveText('25');
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
  await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 2 zile');
  // Home, played and next are in the words too, not only in the colours.
  await expect(page.locator(block('CR U11 și CR U17'))).toHaveAttribute('aria-label', 'CR U11 și CR U17, 3–5 aprilie, Galați, acasă, s-a jucat');
  await expect(page.locator(block('CN U9 și CN U17'))).toHaveClass(/\bnext\b/);
  await expect(page.locator('#ev-competition-2026-11-27-cn-u9-cn-u17')).toContainText('urmează');
  await expect(page.locator('#ev-competition-2026-04-03-cr-u11-cr-u17')).toContainText('acasă');
});

test('the plain list holds every competition in date order', async ({ page }) => {
  await page.goto('/calendar/');
  const list = page.locator('.list');
  await expect(list.getByRole('heading', { level: 2 })).toHaveText('Toate competițiile, pe rând');
  await expect(list.getByRole('heading', { level: 3 })).toHaveText(['Primăvara, Cupele României', 'Toamna, Campionatele Naționale']);
  await expect(list.locator('li')).toHaveCount(12);
  await expect(list.locator('li time')).toHaveText([
    '13–15 mar.', '27–29 mar.', '3–5 apr.', '24–26 apr.', '8–10 mai',
    '4–6 sept.', '11–13 sept.', '18–20 sept.', '25–27 sept.', '23–25 oct.', '20–22 nov.', '27–29 nov.',
  ]);
  await expect(list.locator('#ev-competition-2026-09-04-cn-echipe-seniori')).toContainText('loc de confirmat');
});

test('wide: Tab previews an event, Enter pins it, the button restores the next one', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/');
  const ev = page.locator('.evb', { hasText: '13' }).first();
  await ev.focus();
  await expect(page.locator('.panel')).toContainText('CR U9 și CR Seniori');
  await expect(page.locator('.panel')).toContainText('S-a jucat');
  await expect(page.locator('.panel')).not.toContainText('CN U9 și CN U17');
  await page.keyboard.press('Enter');
  await expect(ev).toHaveClass(/\bon\b/);
  await expect(page).not.toHaveURL(/#ev-/); // pinned in the panel, not a jump to the list
  await expect(page.locator('[data-panel-live]')).toHaveText('CR U9 și CR Seniori, 13–15 martie, București, s-a jucat');
  await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toBeVisible();
  // Moving on previews the next block; leaving it comes back to the pinned one.
  await page.keyboard.press('Tab');
  await expect(page.locator('.panel')).toContainText('CR U15 și CR U23');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.panel')).toContainText('CR U9 și CR Seniori');
  await page.getByRole('button', { name: 'Arată următoarea competiție' }).click();
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
  await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 2 zile');
  await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toBeHidden();
  await expect(page.locator('.evb.on')).toHaveCount(0);
});

test('wide: hovering previews an event, leaving it shows the next one again', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/');
  await page.locator(block('CN U11 și CN U19')).hover();
  await expect(page.locator('.panel')).toContainText('CN U11 și CN U19');
  await expect(page.locator('.panel')).toContainText('acasă');
  await page.mouse.move(0, 0);
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
});

test('narrow: an event leads to its row in the list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/calendar/');
  await page.locator('.evb').first().click();
  await expect(page).toHaveURL(/#ev-competition-2026-03-13-cr-u9-cr-seniori$/);
  await expect(page.locator('#ev-competition-2026-03-13-cr-u9-cr-seniori')).toBeInViewport();
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
});

test('the category filter dims other events, with and without JavaScript', async ({ page, browser, baseURL }) => {
  const opacity = (p: typeof page, sel: string) => p.locator(sel).first().evaluate(e => Number(getComputedStyle(e).opacity));
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const noJs = await ctx.newPage();
  for (const p of [page, noJs]) {
    await p.goto('/calendar/');
    await p.locator('.filter label', { hasText: /^U15$/ }).click();
    await expect(p.getByRole('radio', { name: 'U15' })).toBeChecked();
    expect(await opacity(p, block('CR U9 și CR Seniori'))).toBeLessThan(1);
    expect(await opacity(p, block('CR U15 și CR U23'))).toBe(1);
    expect(await opacity(p, '#ev-competition-2026-03-13-cr-u9-cr-seniori')).toBeLessThan(1);
    expect(await opacity(p, '#ev-competition-2026-03-27-cr-u15-cr-u23')).toBe(1);
    await p.locator('.filter label', { hasText: 'Toate' }).click();
    expect(await opacity(p, block('CR U9 și CR Seniori'))).toBe(1);
  }
  await ctx.close();
});

test('without JavaScript the panel shows the next event and blocks link to the list', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/calendar/');
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
  await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 2 zile');
  await page.locator('.evb').first().click();
  await expect(page).toHaveURL(/#ev-competition-2026-03-13-cr-u9-cr-seniori$/);
  await ctx.close();
});

test('reduced motion shows the blocks without clipping', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await pinClock(page);
  await page.goto('/calendar/');
  const clips = await page.locator('.evb').evaluateAll(els => els.map(e => getComputedStyle(e).clipPath));
  expect(clips).toHaveLength(12);
  expect(new Set(clips)).toEqual(new Set(['none']));
  await ctx.close();
});

test('the blocks fill in on load and end unclipped', async ({ page }) => {
  await page.goto('/calendar/');
  await expect.poll(() => page.locator('.evb').last().evaluate(e => getComputedStyle(e).clipPath)).toBe('none');
  const clips = await page.locator('.evb').evaluateAll(els => els.map(e => getComputedStyle(e).clipPath));
  expect(new Set(clips)).toEqual(new Set(['none']));
});

test('no overflow at 390 and 1440', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/calendar/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
});

test.describe('season over', on('quiet-season'), () => {
  test('the panel says so; a played event links its article', async ({ page }) => {
    await page.goto('/calendar/');
    await expect(page.locator('.panel')).toContainText('Nicio competiție programată deocamdată.');
    await expect(page.locator('#ev-competition-2026-03-27-cr-u15-cr-u23').getByRole('link', { name: 'Articolul clubului' }))
      .toHaveAttribute('href', '/noutati/articol-de-test-cu-galerie/');
    // No categories in this season: no filter; nothing is next.
    await expect(page.locator('.filter')).toHaveCount(0);
    await expect(page.locator('.evb.next, .evb.upcoming')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toHaveCount(0);
  });

  test('pinning a played event shows its article in the panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar/');
    await page.locator(block('CR U15 și CR U23')).click();
    await expect(page.locator('.panel').getByRole('link', { name: 'Articolul clubului' })).toHaveAttribute('href', '/noutati/articol-de-test-cu-galerie/');
  });
});

test.describe('no competition at all', on('sparse'), () => {
  test('one quiet line, no empty grids', async ({ page }) => {
    await page.goto('/calendar/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calendar competițional 2026');
    await expect(page.locator('.mo, .filter, .list, .evb')).toHaveCount(0);
    await expect(page.getByText('Nicio competiție programată deocamdată.')).toBeVisible();
    await expect(page.locator('.head p')).toHaveText(/toamna\.$/);
    await expect(page.getByText('Apasă pe o competiție')).toHaveCount(0);
  });
});
