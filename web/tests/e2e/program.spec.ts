import { test, expect } from '@playwright/test';
import { on } from './servers';

test('without sessions: one quiet line, no grid, no filter', async ({ page }) => {
  await page.goto('/program/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Program și grupe');
  await expect(page.locator('.planner')).toHaveCount(0);
  await expect(page.locator('.filter')).toHaveCount(0);
  await expect(page.getByText('De confirmat de club: zilele și orele fiecărei grupe.')).toBeVisible();
  await expect(page.getByText('De confirmat de club: antrenorul fiecărei grupe.')).toBeVisible();
  await expect(page.locator('#initiere')).toContainText('Inițiere');
  await expect(page.locator('#proba').getByRole('link', { name: 'Cere un antrenament de probă' })).toHaveAttribute('href', '/contact/#formular');
  await expect(page.getByRole('link', { name: 'cum ajungeți' })).toHaveAttribute('href', '/contact/#drum');
  await expect(page.getByRole('link', { name: 'Întrebări de părinte: vârstă, echipament, cost' })).toHaveAttribute('href', '/pentru-parinti/');
});

test.describe('the sample week', on('quiet-season'), () => {
  test('a column per training day, each block with its group and hours', async ({ page }) => {
    await page.goto('/program/');
    await expect(page.locator('.planner h3')).toHaveText(['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']);
    const saturday = page.locator('.daycol', { has: page.getByRole('heading', { name: 'Sâmbătă' }) });
    await expect(saturday.locator('.blk').first()).toHaveText(/^Performanță\s*10:00–12:00$/);
    await expect(page.locator('.planner .hr[aria-hidden="true"]')).toHaveCount(11);
    await expect(page.getByText('Notă de test pentru program.')).toBeVisible();
    await expect(page.locator('.tbc')).toHaveCount(0);
  });

  test('choosing a group from the keyboard leaves only its blocks and announces the count', async ({ page }) => {
    await page.goto('/program/');
    await page.getByRole('radio', { name: 'Toate grupele' }).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Elite' })).toBeChecked();
    const visible = page.locator('.planner .blk:visible');
    await expect(visible).toHaveCount(3);
    await expect(visible.locator('b')).toHaveText(['Elite', 'Elite', 'Elite']);
    await expect(page.locator('[data-filter-status] [aria-live]')).toHaveText('3 antrenamente pe săptămână la Elite');
    // Wide: every day keeps its column and name.
    await expect(page.locator('.planner h3:visible')).toHaveCount(6);
  });

  test('on a phone the days without the chosen group go away', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/program/');
    const monday = page.getByRole('heading', { name: 'Luni' });
    await expect(monday).toBeVisible();
    await page.locator('label', { hasText: 'Elite' }).click();
    await expect(monday).toBeHidden();
    await expect(page.locator('.planner h3:visible')).toHaveText(['Marți', 'Joi', 'Sâmbătă']);
    await ctx.close();
  });

  test('the filter works without JavaScript', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/program/');
    await page.locator('label', { hasText: 'Elite' }).click();
    await expect(page.locator('.planner .blk:visible')).toHaveCount(3);
    await expect(page.locator('.planner .blk:visible b')).toHaveText(['Elite', 'Elite', 'Elite']);
    await ctx.close();
  });

  test('every group names its coach, without a role', async ({ page }) => {
    await page.goto('/program/');
    for (const slug of ['initiere', 'performanta', 'elite', 'amatori-copii', 'amatori-adulti']) {
      await expect(page.locator(`#${slug} .coach`)).toHaveText('Antrenor Exemplu, antrenorul grupei');
    }
  });

  test('reduced motion: the blocks sit in place', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/program/');
    await page.locator('.planner').scrollIntoViewIfNeeded();
    const transforms = await page.locator('.planner .blk').evaluateAll(b => b.map(e => getComputedStyle(e).transform));
    expect(new Set(transforms)).toEqual(new Set(['none']));
    await ctx.close();
  });

  test('with motion the blocks end in place too', async ({ page }) => {
    await page.goto('/program/');
    await page.locator('.planner').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.planner .blk').evaluateAll(b => b.every(e => getComputedStyle(e).transform === 'none')))
      .toBe(true);
  });
});
