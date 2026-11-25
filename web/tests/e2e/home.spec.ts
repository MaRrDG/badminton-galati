import { test, expect } from '@playwright/test';
import { serverURL } from './servers';

test('hero carries the club motto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Ai reușit\?\s*Continuă!\s*N-ai reușit\?\s*Continuă!/);
  await expect(page.locator('.hero')).not.toContainText('Locul');
});

test('roster names its source', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sportivi')).toContainText('Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026');
});

test('sections appear in the agreed order', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('main > section').evaluateAll(s => s.map(e => e.id || e.className.split(' ')[0]));
  expect(ids).toEqual(['hero', 'de-ce', 'program', 'calendar', 'sportivi', 'hall', 'noutati', 'proba']);
});

test('groups are two plain lists', async ({ page }) => {
  await page.goto('/');
  const g = page.locator('#program');
  await expect(g.getByRole('heading', { name: 'Pentru cine vrea performanță' })).toBeVisible();
  await expect(g.getByRole('listitem')).toHaveCount(5);
  await expect(g.locator('table')).toHaveCount(0);
});

test('every image declares its size and has alt text', async ({ page }) => {
  await page.goto('/');
  // An empty alt is allowed only on the club logo, which is decorative next to the club's name.
  const bad = await page.locator('img').evaluateAll(i => i.filter(e =>
    !e.getAttribute('width') || !e.getAttribute('height') || e.getAttribute('alt') === null ||
    (!e.getAttribute('alt') && !e.getAttribute('src')!.endsWith('/logo.jpg'))).length);
  expect(bad).toBe(0);
});

test('all content is visible without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false }); const page = await ctx.newPage();
  await page.goto('/');
  for (const t of ['Ai reușit?', 'Prinzi încredere', 'Nistor Cristian-Ionuț', 'Amatori adulți', 'Novi Sad – 2026'])
    await expect(page.getByText(t).first()).toBeVisible();
  await expect(page.locator('#calendar [data-countdown]')).toHaveText('peste 2 zile');
  await ctx.close();
});

for (const width of [380, 768, 1440]) test(`no overflow or clipped names at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const name = page.getByText('Bordeianu Nectarie-Ioan').first();
  const box = await name.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
});

test('calendar: next event with countdown, then three played events', async ({ page }) => {
  await page.goto('/');
  const cal = page.locator('#calendar');
  await expect(cal.locator('.nextev')).toContainText('CN U9 și CN U17');
  await expect(cal.locator('[data-countdown]')).toHaveText('peste 2 zile');
  await expect(cal.locator('.played li')).toHaveCount(3);
  await expect(cal.locator('.played li').nth(1)).toContainText('acasă');
  await expect(cal.getByRole('link', { name: 'Tot calendarul 2026' })).toHaveAttribute('href', '/calendar/');
});

test.describe('countdown follows the visitor’s clock, not the build date', () => {
  const at = (iso: string) => new Date(`${iso}T09:00:00+02:00`);
  for (const [day, label] of [['2026-11-26', 'începe mâine'], ['2026-11-27', 'începe azi'], ['2026-11-28', 'în desfășurare']])
    test(`on ${day} it reads "${label}"`, async ({ page }) => {
      await page.clock.setFixedTime(at(day));
      await page.goto('/');
      await expect(page.locator('#calendar [data-countdown]')).toHaveText(label);
    });

  test('after the event it disappears', async ({ page }) => {
    await page.clock.setFixedTime(at('2026-11-30'));
    await page.goto('/');
    await expect(page.locator('#calendar [data-countdown]')).toBeHidden();
  });
});

test.describe('a season with no competition left', () => {
  test.use({ baseURL: serverURL('empty-season') });

  test('shows three played events and no countdown', async ({ page }) => {
    await page.goto('/');
    const cal = page.locator('#calendar');
    await expect(cal.locator('.played li')).toHaveCount(3);
    await expect(cal.locator('.played li', { hasText: 'jucat' })).toHaveCount(3);
    await expect(cal.locator('[data-countdown]')).toHaveCount(0);
    await expect(cal).not.toContainText(/peste -?\d+ (de )?zile/);
  });
});

test.describe('athletes without rankings', () => {
  test.use({ baseURL: serverURL('no-rankings') });

  test('roster shows names and FRB links, no places and no source line', async ({ page }) => {
    await page.goto('/');
    const roster = page.locator('#sportivi');
    await expect(roster).not.toContainText('Clasamentul FRB');
    for (const name of ['Nistor Cristian-Ionuț', 'Pazargic Ligia-Beatrice', 'Bordeianu Nectarie-Ioan'])
      await expect(roster.getByRole('heading', { name })).toBeVisible();
    await expect(roster.getByRole('link', { name: 'Profilul FRB' })).toHaveCount(3);
    await expect(page.locator('[data-roll]')).toHaveCount(0);
  });
});
