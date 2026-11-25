import { test, expect, type Page } from '@playwright/test';

const HEADLINE = 'Fluturașul a rămas în fileu';

/** The drawing the current width shows (wide or tall; the other is display: none). */
const scene = (page: Page) => page.locator('svg[data-rally]:visible');

/** Centre of the shuttle and the box of the net's 0, in page pixels. */
const shuttleAndZero = (page: Page) => scene(page).evaluate(svg => {
  const s = svg.querySelector('[data-shuttle]')!.getBoundingClientRect();
  const z = svg.querySelector('[data-zero]')!.parentElement!.getBoundingClientRect();
  return { x: s.x + s.width / 2, y: s.y + s.height / 2, zero: { left: z.left, right: z.right, top: z.top, bottom: z.bottom } };
});

const expectShuttleInZero = async (page: Page) => {
  const { x, y, zero } = await shuttleAndZero(page);
  expect(x).toBeGreaterThan(zero.left);
  expect(x).toBeLessThan(zero.right);
  expect(y).toBeGreaterThan(zero.top);
  expect(y).toBeLessThan(zero.bottom);
};

/** Every transform in the scene, to tell a moving picture from a still one. */
const snapshot = (page: Page) => scene(page).evaluate(svg =>
  [...svg.querySelectorAll('[transform]')].map(e => e.getAttribute('transform')).join('|'));

test('the built 404 page has the headline, the ways out and the shell', async ({ page }) => {
  const response = await page.goto('/404.html');
  expect(response!.ok()).toBe(true);
  await expect(page).toHaveTitle(/Pagină negăsită/);
  await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Înapoi acasă' })).toHaveAttribute('href', '/');
  const ways = page.getByRole('navigation', { name: 'Alte pagini' });
  for (const name of ['Program', 'Calendar', 'Noutăți', 'Contact']) await expect(ways.getByRole('link', { name })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  // The scene is decoration: the text carries the meaning.
  await expect(scene(page)).toHaveAttribute('aria-hidden', 'true');
});

test('an unknown address shows the page with status 404', async ({ page }) => {
  const response = await page.goto('/pagina-care-nu-exista/');
  expect(response!.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
});

test('the rally runs: the shuttle crosses the net, with no page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/404.html');
  // It starts caught in the 0, drops, is served, and must then be seen on both sides of the net.
  await page.waitForFunction(() => {
    const svg = [...document.querySelectorAll<SVGSVGElement>('svg[data-rally]')].find(s => s.getClientRects().length)!;
    const x = Number(/translate\(([-\d.]+)/.exec(svg.querySelector('[data-shuttle]')!.getAttribute('transform')!)![1]);
    const w = svg.viewBox.baseVal.width;
    const seen = ((window as unknown as { seen?: Set<string> }).seen ??= new Set());
    if (x > 0 && x < w * 0.3) seen.add('left');
    if (x > w * 0.7) seen.add('right');
    return seen.size === 2;
  }, undefined, { timeout: 12_000, polling: 'raf' });
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('reduced motion shows the still frame: the shuttle stays in the 0', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/404.html');
  const first = await snapshot(page);
  await expectShuttleInZero(page);
  await page.waitForTimeout(700);
  expect(await snapshot(page)).toBe(first);
  await ctx.close();
});

test('without JavaScript the headline, the links and the still scene are there', async ({ browser }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport });
    const page = await ctx.newPage();
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Înapoi acasă' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Alte pagini' }).getByRole('link')).toHaveCount(5);
    await expect(scene(page)).toHaveCount(1);
    await expect(scene(page).locator('[data-player]')).toHaveCount(2);
    await expectShuttleInZero(page);
    await ctx.close();
  }
});

test('the scene takes no input: no hint, nothing to focus or press', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/404.html');
    await expect(page.getByText(/Atinge|Apasă/)).toHaveCount(0);
    await expect(page.locator('[data-rally-hint]')).toHaveCount(0);
    const stage = page.locator('[data-rally-stage]');
    await expect(stage.locator('a, button, input, select, textarea, [tabindex], [role], [contenteditable]')).toHaveCount(0);
    expect(await stage.evaluate(el => getComputedStyle(el).cursor)).toBe('auto');
    // Tab from the last way out leaves the section without stopping in the scene.
    await page.getByRole('navigation', { name: 'Alte pagini' }).getByRole('link', { name: 'Contact' }).focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-rally-stage]')))).toBe(false);
  }
});

for (const width of [380, 1440])
  test(`no horizontal overflow at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/404.html');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

test('on a large screen the page is one full screen, the court standing on the footer', async ({ page }) => {
  for (const [width, height] of [[2560, 1300], [1920, 1080], [3440, 1440]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/404.html');
    const m = await page.evaluate(() => {
      const foot = document.querySelector('footer')!.getBoundingClientRect();
      const court = document.querySelector('.nf-court')!.getBoundingClientRect();
      const text = document.querySelector('.nf-text')!.getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth,
        footTop: foot.top, footBottom: foot.bottom, courtBottom: court.bottom, sky: court.top - text.bottom,
      };
    });
    const size = `${width}×${height}`;
    expect(m.scroll, size).toBe(height);
    expect(Math.abs(m.footBottom - height), size).toBeLessThanOrEqual(1);
    // The spare height is sky: the floor strip still meets the footer.
    expect(Math.abs(m.courtBottom - m.footTop), size).toBeLessThanOrEqual(1);
    expect(m.sky, size).toBeGreaterThan(0);
    expect(m.overflow, size).toBeLessThanOrEqual(0);
  }
});
