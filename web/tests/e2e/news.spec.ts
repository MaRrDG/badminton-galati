import { test, expect, type Page } from '@playwright/test';
import { on } from './servers';
import { DIM_OPACITY } from '../../src/lib/filter';

/** The radios of the kind filter must be named exactly these ("Toate, 3": the word, then its count). */
async function expectFilterNames(p: Page, names: string[]) {
  const radios = p.getByRole('radio');
  await expect(radios).toHaveCount(names.length);
  for (const [i, name] of names.entries()) await expect(radios.nth(i)).toHaveAccessibleName(name);
}
const opacity = (p: Page, sel: string) => p.locator(sel).evaluateAll(els => els.map(e => Number(getComputedStyle(e).opacity)));

test('the featured article leads the front in big uppercase type', async ({ page }) => {
  await page.goto('/noutati/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noutăți');
  const feat = page.locator('.front .feat');
  const title = feat.getByRole('heading', { level: 2 });
  await expect(title).toHaveText('Novi Sad – 2026');
  await expect(title).toHaveCSS('text-transform', 'uppercase');
  await expect(feat.locator('.meta')).toHaveText('Competiție, 30 iunie 2026');
  await expect(feat.getByRole('link', { name: 'Novi Sad – 2026', exact: true })).toHaveAttribute('href', '/noutati/novi-sad-2026/');
  await expect(feat.locator('.plated img')).toHaveAttribute('loading', 'eager');
  await expect(page.locator('.front .side')).toHaveCount(2);
  // Every post is a competition: one kind, nothing to choose, so no filter.
  await expect(page.locator('.filter')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  // Every article title is an h2 under the page's h1; only the featured one is set big.
  await expect(page.locator('.front h2')).toHaveCount(3);
  await expect(page.locator('.front h3')).toHaveCount(0);
  await expect(page.locator('.front .side h2').first()).toHaveCSS('text-transform', 'none');
  await expect(page.getByText('Mai vechi')).toHaveCount(0);
});

test('every item is one link named by its title, the cover decorative', async ({ page }) => {
  await page.goto('/noutati/');
  const items = page.locator('.front > li');
  await expect(items).toHaveCount(3);
  for (const li of await items.all()) {
    const title = (await li.getByRole('heading').textContent())!.trim();
    const links = li.getByRole('link');
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAccessibleName(title);
    await expect(li.locator('time')).toHaveCount(1);
  }
  await expect(page.locator('.front .feat img')).toHaveAttribute('alt', '');
  // The whole item opens the article, not only its title.
  const side = page.locator('.front .side').first();
  const box = (await side.boundingBox())!;
  await page.mouse.click(box.x + box.width - 8, box.y + 8);
  await expect(page).toHaveURL(/\/noutati\/bucuresti-memorialul-rotaru-u15-2026\/$/);
});

test.describe('a full front', on('quiet-season'), () => {
  test('sizes, tiles and the older band', async ({ page }) => {
    await page.goto('/noutati/');
    await expect(page.locator('.front > li')).toHaveCount(11);
    const older = page.locator('.older');
    await expect(older.getByRole('heading', { level: 2 })).toHaveText('Mai vechi');
    await expect(older.locator('li')).toHaveCount(4);
    await expect(older.locator('li').first()).toContainText('6 medalii pentru Siderurgistul la Cupa României U15');
    // Articles without a cover are colour tiles, with no image at all.
    await expect(page.locator('.front .tile')).toHaveCount(8);
    await expect(page.locator('.front .tile img')).toHaveCount(0);
    await expect(page.locator('.front .ph img')).toHaveCount(3);
    await expectFilterNames(page, ['Toate, 15', 'Competiție, 11', 'Viața clubului, 3', 'Proiecte, 1']);
    await expect(page.locator('.filter label sup')).toHaveText(['15', '11', '3', '1']);
  });

  test('the kind filter dims the other kinds from the keyboard', async ({ page }) => {
    await page.goto('/noutati/');
    await page.getByRole('radio', { name: /^Toate/ }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: /^Viața clubului/ })).toBeChecked();
    // Dimmed, still readable (tokens.test.ts proves 3:1 at this opacity), and grey.
    for (const o of await opacity(page, '[data-f="competitie"]')) expect(o).toBeCloseTo(DIM_OPACITY, 5);
    await expect(page.locator('[data-f="competitie"]').first()).toHaveCSS('filter', 'grayscale(1)');
    expect(await opacity(page, '[data-f="viata-clubului"]')).toEqual([1, 1, 1]);
    await expect(page.locator('[data-f="viata-clubului"]').first()).toHaveCSS('filter', 'none');
    // Dimmed, never hidden: the layout keeps its places.
    await expect(page.locator('.front > li:visible')).toHaveCount(11);
  });

  test('the filter works without JavaScript', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/noutati/');
    await page.locator('.filter label', { hasText: 'Proiecte' }).click();
    expect(await opacity(page, '[data-f="proiecte"]')).toEqual([1]);
    for (const o of await opacity(page, '[data-f="competitie"], [data-f="viata-clubului"]')) expect(o).toBeCloseTo(DIM_OPACITY, 5);
    await ctx.close();
  });
});

test.describe('no photo at all', on('sparse'), () => {
  test('the featured article is a blue tile', async ({ page }) => {
    await page.goto('/noutati/');
    const feat = page.locator('.front .feat');
    await expect(feat).toHaveClass(/\btile\b/);
    await expect(feat).toHaveClass(/\bblue\b/);
    await expect(feat.locator('img')).toHaveCount(0);
    await expect(feat.getByRole('heading', { level: 2 })).toHaveText('Novi Sad – 2026');
    await expect(page.locator('main img')).toHaveCount(0);
  });
});

test('the featured photo arrives on load and ends as rendered', async ({ page }) => {
  await page.goto('/noutati/');
  await expect.poll(() => page.locator('.feat .plate').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).isIdentity)).toBe(true);
  await expect.poll(() => page.locator('.feat .shot').evaluate(e => getComputedStyle(e).clipPath)).toBe('none');
});

test('reduced motion shows the featured photo at rest', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/noutati/');
  await expect(page.locator('.feat .plate')).toHaveCSS('transform', 'none');
  await expect(page.locator('.feat .shot')).toHaveCSS('clip-path', 'none');
  await ctx.close();
});
