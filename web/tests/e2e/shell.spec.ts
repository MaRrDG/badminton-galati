import { test, expect } from '@playwright/test';

test('shell renders in Romanian with nav and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  for (const n of ['Acasă', 'Sportivi', 'Program', 'Calendar', 'Noutăți', 'Contact'])
    await expect(page.getByRole('navigation').getByRole('link', { name: n })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('siderurgistul@badmintongalati.ro');
});

for (const width of [380, 1440])
  test(`no horizontal overflow at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

test('fonts are self-hosted', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', (r) => hosts.add(new URL(r.url()).host));
  await page.goto('/');
  expect([...hosts].some((h) => h.includes('googleapis') || h.includes('gstatic'))).toBe(false);
});
