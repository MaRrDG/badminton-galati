import { test, expect } from '@playwright/test';
import { on } from './servers';

test('the wall shows consented athletes as tiles, oldest category first', async ({ page }) => {
  await page.goto('/sportivi/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sportivii clubului');
  await expect(page.locator('.wall h3')).toHaveText(['Nistor Cristian-Ionuț', 'Pazargic Ligia-Beatrice', 'Bordeianu Nectarie-Ioan']);
  await expect(page.locator('.wall .mark').first()).toHaveText(/2\s*în țară/);
  await expect(page.locator('.wall .ini')).toHaveText(['NC', 'PL', 'BN']);
  await expect(page.getByRole('link', { name: 'Nistor Cristian-Ionuț' })).toHaveAttribute('href', '/sportivi/nistor-cristian-ionut/');
  await expect(page.locator('.roster')).toContainText('Locul în țară: Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026.');
});

test('the whole tile is the link to the athlete', async ({ page }) => {
  await page.goto('/sportivi/');
  const tile = page.locator('.wall .tile').nth(1);
  const box = (await tile.boundingBox())!;
  await page.mouse.click(box.x + 12, box.y + 12); // the top left of the tile, far from the name
  await expect(page).toHaveURL(/\/sportivi\/pazargic-ligia-beatrice\/$/);
});

test('the category filter works from the keyboard and announces the count', async ({ page }) => {
  await page.goto('/sportivi/');
  await page.getByRole('radio', { name: 'Toți' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'U15' })).toBeChecked();
  await expect(page.locator('.wall .tile:visible')).toHaveCount(1);
  await expect(page.locator('[data-filter-status] [aria-live]')).toHaveText('1 sportiv la U15');
});

test('the filter works without JavaScript', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/sportivi/');
  await page.locator('label', { hasText: 'U13' }).click();
  await expect(page.locator('.wall .tile:visible')).toHaveCount(1);
  await expect(page.locator('.wall .tile:visible h3')).toHaveText('Bordeianu Nectarie-Ioan');
  await expect(page.locator('[data-count-for]:visible')).toHaveText(['1 sportiv la U13']);
  await ctx.close();
});

test('reduced motion shows the final place digits', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/sportivi/');
  await expect(page.locator('.wall .mark b')).toHaveText(['2', '3', '58']);
  await ctx.close();
});

test('the place digits roll to the place and are read as the place', async ({ page }) => {
  await page.goto('/sportivi/');
  const mark = page.locator('.wall .mark').first();
  await expect(mark.locator('[data-roll] i')).toHaveCount(1); // the motion layer built its digit cells
  // The rolling band of digits is hidden from screen readers, which still hear "2 în țară".
  await expect(mark).toMatchAriaSnapshot('- paragraph: 2 în țară');
});

test.describe('an athlete without consent', on('mixed-strip'), () => {
  test('has no tile and is not counted', async ({ page }) => {
    const html = await (await page.goto('/sportivi/'))!.text();
    expect(html).not.toContain('Fără-Acord');
    expect(html).not.toContain('fara-acord');
    await expect(page.locator('.wall .tile')).toHaveCount(3);
    // Only Nistor has a category here (U17). Counted, her U15 place would add a second
    // category, and with it the filter and its counts.
    await expect(page.locator('.filter, [data-count-for]')).toHaveCount(0);
  });
});

test.describe('nobody may be shown', on('sparse'), () => {
  test('a quiet line instead of an empty wall', async ({ page }) => {
    await page.goto('/sportivi/');
    await expect(page.locator('.wall, .filter')).toHaveCount(0);
    await expect(page.getByText('Sportivii apar aici după ce părinții își dau acordul.')).toBeVisible();
    await expect(page.getByText('Locul în țară')).toHaveCount(0);
  });
});

test.describe('a photo and a birth year', on('quiet-season'), () => {
  test('the photo fills its tile; the category comes from the birth year', async ({ page }) => {
    await page.goto('/sportivi/');
    const tile = page.locator('.wall .tile', { hasText: 'Zet Exemplu-Ana' });
    const img = tile.locator('img');
    await expect(img).toHaveCSS('object-fit', 'cover');
    await expect(img).toHaveCSS('object-position', '50% 18%');
    await expect(tile.locator('.cap p')).toHaveText('U13');
    // Unranked athletes carry no place, and no ranking source line is shown.
    await expect(page.locator('.wall .mark')).toHaveCount(0);
    await expect(page.locator('.roster')).not.toContainText('Clasamentul FRB');
  });
});
