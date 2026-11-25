import { test, expect, type Locator, type Page } from '@playwright/test';

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

test.describe('narrow menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const links = ['Acasă', 'Sportivi', 'Program', 'Calendar', 'Noutăți', 'Contact'];

  const opensAndCloses = async (page: Page) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Meniu principal' });
    for (const n of links) await expect(nav.getByRole('link', { name: n })).toBeHidden();
    await nav.getByText('Meniu', { exact: true }).click();
    for (const n of links) await expect(nav.getByRole('link', { name: n })).toBeVisible();
    await nav.getByText('Meniu', { exact: true }).click();
    await expect(nav.getByRole('link', { name: 'Acasă' })).toBeHidden();
  };

  test('links stay hidden until "Meniu" is clicked', async ({ page }) => {
    await opensAndCloses(page);
  });

  test('works without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await opensAndCloses(await ctx.newPage());
    await ctx.close();
  });
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

test.describe('the menu marks the current section', () => {
  const menuLink = (page: Page, name: string) => page.getByRole('navigation', { name: 'Meniu principal' }).getByRole('link', { name, exact: true });
  /** The red line under a menu link that marks it (transparent when unmarked). */
  const underline = (link: Locator) => link.evaluate(e => getComputedStyle(e).borderBottomColor);
  const RED = 'rgb(226, 58, 69)';
  const NONE = 'rgba(0, 0, 0, 0)';

  test('a section page is the current page', async ({ page }) => {
    await page.goto('/noutati/');
    await expect(menuLink(page, 'Noutăți')).toHaveAttribute('aria-current', 'page');
    await expect(menuLink(page, 'Acasă')).not.toHaveAttribute('aria-current');
  });

  for (const [path, name] of [['/noutati/novi-sad-2026/', 'Noutăți'], ['/sportivi/bordeianu-nectarie-ioan/', 'Sportivi']] as const)
    test(`a page under a section marks the section: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      const link = menuLink(page, name);
      // The section is current, but the link is not the page itself.
      await expect(link).toHaveAttribute('aria-current', 'true');
      expect(await underline(link)).toBe(RED);
      for (const other of ['Acasă', 'Program', 'Calendar', 'Contact']) {
        await expect(menuLink(page, other)).not.toHaveAttribute('aria-current');
        expect(await underline(menuLink(page, other))).toBe(NONE);
      }
    });
});

test('the footer links parents and Facebook', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Pentru părinți' })).toHaveAttribute('href', '/pentru-parinti/');
  await expect(footer.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/badmintongalati');
  await expect(page.locator('#contact')).toHaveCount(0);
  await expect(page.locator('a[href="#contact"], a[href="/#contact"]')).toHaveCount(0);
});

const ROUTES = ['/sportivi/', '/sportivi/bordeianu-nectarie-ioan/', '/calendar/', '/noutati/', '/noutati/novi-sad-2026/', '/program/', '/pentru-parinti/', '/contact/'];

test('every inner page fits 380px, sizes and describes its images, and raises no error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 380, height: 800 });
  for (const r of ROUTES) {
    await page.goto(r);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), r).toBeLessThanOrEqual(0);
    expect(await page.locator('img:not([width]), img:not([height]), img:not([alt])').count(), r).toBe(0);
    expect(await page.locator('h1.display').count(), r).toBe(1);
  }
  expect(errors).toEqual([]);
});

test('every inner page shows its content without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    await page.goto(r);
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1, r).toBeVisible();
    // More than the title: the page's own content is there (an article may be a title and a date).
    expect((await page.locator('main').innerText()).trim().length, r).toBeGreaterThan((await h1.innerText()).length + 20);
  }
  await ctx.close();
});
