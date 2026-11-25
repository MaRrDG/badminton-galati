import { test, expect } from '@playwright/test';
import { on } from './servers';

const NOVI_SAD = '/noutati/novi-sad-2026/';
const TEST_POST = '/noutati/articol-de-test-cu-galerie/';

test('an article without body, gallery or tags: the head, the cover and the neighbours', async ({ page }) => {
  await page.goto(NOVI_SAD);
  await expect(page).toHaveTitle('Novi Sad – 2026 | CS Siderurgistul Galați');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Novi Sad – 2026');
  await expect(page.locator('.arthead .meta')).toHaveText('Competiție, 30 iunie 2026');
  const cover = page.locator('.cover img');
  await expect(cover).toHaveAttribute('loading', 'eager');
  await expect(cover).toHaveAttribute('fetchpriority', 'high');
  await expect(page.locator('.prose p')).toHaveCount(0);
  await expect(page.locator('.gallery')).toHaveCount(0);
  await expect(page.locator('.comp')).toHaveCount(0);
  await expect(page.getByText('Sportivi în articol')).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Alte articole' });
  await expect(nav.getByRole('link', { name: /Mai vechi/ })).toHaveAttribute('href', '/noutati/bucuresti-memorialul-rotaru-u15-2026/');
  await expect(nav.getByText(/Mai nou/)).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Toate articolele' })).toHaveAttribute('href', '/noutati/');
  // Big uppercase type once: the title.
  await expect(page.locator('main .display')).toHaveCount(1);
});

test('share links are built in the browser; without JavaScript the row is hidden', async ({ page, browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const bare = await ctx.newPage();
  await bare.goto(NOVI_SAD);
  await expect(bare.locator('.share')).toBeHidden();
  await ctx.close();

  await page.goto(NOVI_SAD);
  const share = page.locator('.share');
  await expect(share).toBeVisible();
  const url = encodeURIComponent(page.url());
  expect(await share.getByRole('link', { name: 'Facebook' }).getAttribute('href')).toContain(url);
  expect(await share.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toBe(
    `https://wa.me/?text=${encodeURIComponent(`Novi Sad – 2026 ${page.url()}`)}`,
  );
});

test('"Copiază linkul" copies the address, or shows it selected without a clipboard', async ({ page, context, baseURL }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
  await page.goto(NOVI_SAD);
  const copy = page.locator('.share button');
  await expect(copy).toHaveAccessibleName('Copiază linkul');
  await copy.click();
  await expect(copy).toHaveText('Link copiat');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());

  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }));
  await page.reload();
  await page.locator('.share button').click();
  const field = page.locator('.share input');
  await expect(field).toBeVisible();
  await expect(field).toHaveValue(page.url());
  await expect(field).toBeFocused();
});

test.describe('the test article', on('quiet-season'), () => {
  test('body, linked competition, tagged athlete and gallery', async ({ page }) => {
    await page.goto(TEST_POST);
    const prose = page.locator('.prose');
    await expect(prose.locator('p.lead')).toHaveCount(1);
    await expect(prose.locator('h2')).toHaveCount(1);
    await expect(prose.locator('li').first()).toBeVisible();
    await expect(prose.locator('blockquote')).toHaveCount(1);
    await expect(prose.locator('figure.pull img[width][height]')).toHaveCount(1);
    await expect(prose.locator('a[href^="https://"]')).toHaveAttribute('rel', 'noopener');

    const comp = page.locator('.comp');
    await expect(comp).toContainText('CR U15 și CR U23');
    await expect(comp.getByRole('link', { name: 'În calendar' })).toHaveAttribute('href', '/calendar/#ev-competition-2026-03-27-cr-u15-cr-u23');
    await expect(comp.getByRole('link', { name: 'Rezultatele pe badminton.ro' })).toHaveCount(0);

    const tagged = page.locator('.tagged');
    await expect(tagged.getByRole('heading', { name: 'Sportivi în articol' })).toHaveCSS('text-transform', 'none');
    const row = tagged.locator('li');
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('link', { name: 'Zet Exemplu-Ana' })).toHaveAttribute('href', '/sportivi/zet-exemplu-ana/');
    await expect(row).toContainText('aur');

    const gallery = page.locator('.gallery');
    await expect(gallery.getByRole('heading', { name: 'Fotografii' })).toHaveCSS('text-transform', 'none');
    await expect(gallery).toContainText('7 fotografii. Apasă pe una ca s-o vezi mare.');
    await expect(gallery.locator('.mosaic img')).toHaveCount(7);
    for (const img of await gallery.locator('.mosaic img').all()) {
      await expect(img).toHaveAttribute('loading', 'lazy');
      await expect(img).toHaveAttribute('width', /\d+/);
    }
    await expect(page.locator('main .display')).toHaveCount(1);
  });

  test('the lightbox from the keyboard', async ({ page }) => {
    await page.goto(TEST_POST);
    const first = page.locator('.mosaic a').first();
    await first.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Fotografie mărită' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.count')).toHaveText('1 din 7');
    await expect(dialog.locator('img')).toHaveAttribute('src', '/img/cantonament.jpg');
    expect(await dialog.evaluate(d => d.contains(document.activeElement))).toBe(true);
    // The page behind does not scroll while the photo is open.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('.count')).toHaveText('2 din 7');
    await expect(dialog.locator('img')).toHaveAttribute('src', '/img/smash.jpg');
    await expect(dialog.locator('img')).toHaveAttribute('height', '1200');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.locator('.count')).toHaveText('7 din 7');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');

    await first.click();
    await dialog.getByRole('button', { name: 'Următoarea' }).click();
    await expect(dialog.locator('.count')).toHaveText('2 din 7');
    await dialog.getByRole('button', { name: 'Închide' }).click();
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('without JavaScript the gallery links open the photos', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(TEST_POST);
    await expect(page.locator('.mosaic a').first()).toHaveAttribute('href', '/img/cantonament.jpg');
    await expect(page.locator('dialog')).toBeHidden();
    await ctx.close();
  });
});

test('a non-consented athlete is never tagged', on('mixed-strip'), async ({ page }) => {
  const res = await page.goto(NOVI_SAD);
  expect(res!.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Novi Sad – 2026');
  await expect(page.getByText('Sportivi în articol')).toHaveCount(0);
  expect(await res!.text()).not.toContain('Fără-Acord');
});
