import { test, expect } from '@playwright/test';
import { on } from './servers';

test('the wall shows consented athletes as tiles, oldest category first', async ({ page }) => {
  await page.goto('/sportivi/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sportivii clubului');
  await expect(page.getByText('Apasă pe un sportiv ca să vezi unde a ajuns.')).toBeVisible();
  await expect(page.locator('.wall h3')).toHaveText(['Nistor Cristian-Ionuț', 'Pazargic Ligia-Beatrice', 'Bordeianu Nectarie-Ioan']);
  await expect(page.locator('.wall .mark').first()).toContainText('în țară');
  await expect(page.locator('.wall .mark [data-roll]').first()).toHaveAttribute('data-roll', '2');
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

test('a place rolls when the filter brings its tile into view', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 760 } });
  const page = await ctx.newPage();
  await page.goto('/sportivi/');
  // Bordeianu (U13) sits on the second row, below the line where a place starts to roll.
  const band = page.locator('.wall .tile', { hasText: 'Bordeianu' }).locator('[data-roll] i span').first();
  const final = await band.evaluate(b => b.style.transform);
  await page.waitForTimeout(400);
  expect(await band.evaluate(b => b.style.transform)).toBe(final);
  await page.locator('label', { hasText: 'U13' }).click();
  // Moved up to the first row, the tile is in view, so its place rolls.
  await expect.poll(() => band.evaluate(b => b.style.transform), { intervals: [50] }).not.toBe(final);
  await ctx.close();
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
    // Nobody to press: the lede and the description leave out the invitation.
    await expect(page.getByText('Apasă pe un sportiv')).toHaveCount(0);
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Apasă/);
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
