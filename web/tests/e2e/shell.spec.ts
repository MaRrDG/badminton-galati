import { test, expect, type Locator } from '@playwright/test';

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

test.describe('focus ring', () => {
  /** Focuses `el` the way a keyboard would show it, and reads its outline and text colour. */
  const ring = (el: Locator) => el.evaluate(e => {
    (e as HTMLElement).focus({ focusVisible: true } as FocusOptions);
    const cs = getComputedStyle(e);
    return { visible: e.matches(':focus-visible'), style: cs.outlineStyle, width: cs.outlineWidth, ring: cs.outlineColor, text: cs.color };
  });
  const WHITE = 'rgb(255, 255, 255)';
  const INK = 'rgb(10, 31, 77)';

  test('a link takes its own text colour: ink on white, white on red', async ({ page }) => {
    await page.goto('/');
    for (const [link, colour] of [
      [page.locator('#noutati').getByRole('link', { name: 'Toate articolele' }), INK],
      [page.locator('#calendar').getByRole('link', { name: /^Tot calendarul/ }), WHITE],
    ] as const) {
      const r = await ring(link);
      expect(r.visible).toBe(true);
      expect([r.style, r.width]).toEqual(['solid', '3px']);
      expect(r.ring).toBe(r.text);
      expect(r.ring).toBe(colour);
    }
  });

  test('buttons on a coloured field get a white ring, the dark menu button an ink one', async ({ page }) => {
    await page.goto('/');
    expect((await ring(page.locator('.hero-go'))).ring).toBe(WHITE);
    expect((await ring(page.locator('#proba .btn'))).ring).toBe(WHITE);
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await ring(page.locator('.menu summary'))).ring).toBe(INK);
  });
});
