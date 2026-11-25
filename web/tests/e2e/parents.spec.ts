import { test, expect } from '@playwright/test';
import { on } from './servers';

const QUESTIONS = ['varsta', 'echipament', 'cost', 'inceput', 'dupa', 'antrenori', 'sala'];

test('a reading page: the questions listed, every unknown answer marked for the club', async ({ page }) => {
  await page.goto('/pentru-parinti/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pentru părinți');

  const toc = page.getByRole('navigation', { name: 'Întrebările de pe pagină' });
  const links = toc.getByRole('link');
  await expect(links).toHaveCount(7);
  expect(await links.evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(QUESTIONS.map(id => `#${id}`));
  for (const id of QUESTIONS) await expect(page.locator(`section.q#${id} h2.qh`)).toHaveCount(1);

  // age, equipment, cost, first weeks, registration, coaches' photos
  await expect(page.locator('.tbc')).toHaveCount(6);
  for (const id of ['varsta', 'echipament', 'cost', 'inceput', 'dupa', 'antrenori']) {
    await expect(page.locator(`#${id} .tbc`)).toHaveCount(1);
  }

  const coaches = page.locator('.coaches li');
  await expect(coaches.locator('.ini')).toHaveText(['DB', 'IC', 'AP']);
  await expect(coaches.locator('b')).toHaveText(['Dorel Badiu', 'Iulian Călin', 'Adrian Panfil']);
  await expect(coaches).toHaveText(['Dorel Badiu', 'Iulian Călin', 'Adrian Panfil'].map(n => new RegExp(`^\\s*(DB|IC|AP)?\\s*${n}\\s*$`)));
  await expect(page.locator('#antrenori')).toContainText('Clubul e condus de antrenorii săi.');

  await expect(page.getByRole('link', { name: 'Inițiere', exact: true })).toHaveAttribute('href', '/program/#initiere');
  await expect(page.getByRole('link', { name: 'Amatori copii', exact: true })).toHaveAttribute('href', '/program/#amatori-copii');
  await expect(page.getByRole('link', { name: 'formularul de probă' })).toHaveAttribute('href', '/contact/#formular');
  await expect(page.locator('#sala img')).toHaveAttribute('src', '/img/sala-turneu-2.jpg');
  await expect(page.locator('#sala').getByRole('link', { name: 'Cum ajungeți' })).toHaveAttribute('href', '/contact/#drum');
  await expect(page.locator('#proba').getByRole('link', { name: 'Cere un antrenament de probă' })).toHaveAttribute('href', '/contact/#formular');
});

test('following a question from the list moves the reader there', async ({ page }) => {
  await page.goto('/pentru-parinti/');
  await page.getByRole('navigation', { name: 'Întrebările de pe pagină' }).getByRole('link', { name: 'Cât costă?' }).click();
  await expect(page).toHaveURL(/#cost$/);
  await expect(page.locator('#cost h2')).toBeInViewport();
  // The next Tab continues from the question, not from the list.
  await page.keyboard.press('Tab');
  const after = await page.evaluate(() => {
    const cost = document.getElementById('cost')!;
    const active = document.activeElement!;
    return Boolean(cost.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING) || cost.contains(active);
  });
  expect(after).toBe(true);
});

for (const width of [1440, 1024, 861, 860, 390]) {
  test(`the list of questions stays readable and clear of the text and the footer at ${width}px`, async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/pentru-parinti/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const tocLinksInside = async () => {
      for (const box of await page.locator('.toc a').evaluateAll(as => as.map(a => a.getBoundingClientRect().toJSON()))) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
      }
    };
    await tocLinksInside();
    if (width <= 860) {
      // One column: the list comes first, static, as wide as the text.
      await expect(page.locator('.toc-wrap')).toHaveCSS('position', 'static');
      const [toc, text] = await Promise.all(['.toc', '.reading .text'].map(s => page.locator(s).boundingBox()));
      expect(toc!.y + toc!.height).toBeLessThanOrEqual(text!.y);
      await ctx.close();
      return;
    }
    await expect(page.locator('.toc-wrap')).toHaveCSS('position', 'sticky');
    expect((await page.locator('.toc').boundingBox())!.width).toBeGreaterThanOrEqual(200);
    await page.evaluate(() => window.scrollTo(0, 1600));
    expect((await page.locator('.toc').boundingBox())!.y).toBe(20); // it follows the reader
    for (const y of [0, 1200, 2400, 99999]) {
      await page.evaluate(top => window.scrollTo(0, top), y);
      const [t, text, footer, venue] = await Promise.all(['.toc', '.reading .text', '.site-footer', '#sala'].map(s => page.locator(s).first().boundingBox()));
      expect(t!.x).toBeGreaterThanOrEqual(text!.x + text!.width);
      expect(t!.y + t!.height).toBeLessThanOrEqual(venue!.y);
      expect(t!.y + t!.height).toBeLessThanOrEqual(footer!.y);
      expect(t!.height).toBeLessThanOrEqual(900);
      await tocLinksInside();
    }
    await ctx.close();
  });
}

test('reduced motion shows the opening photo at rest', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/pentru-parinti/');
  await expect(page.locator('.opening .plate')).toHaveCSS('transform', 'none');
  await expect(page.locator('.opening .shot')).toHaveCSS('clip-path', 'none');
  await ctx.close();
});

test.describe('with the club\'s answers', on('quiet-season'), () => {
  test('an answer takes the place of its placeholder; the rest stay marked', async ({ page }) => {
    await page.goto('/pentru-parinti/');
    await expect(page.locator('#cost')).toContainText('Răspuns de test pentru cost.');
    await expect(page.locator('#cost p')).toHaveCount(2);
    await expect(page.locator('#cost .tbc')).toHaveCount(0);
    await expect(page.locator('#varsta')).toContainText('Răspuns de test pentru vârstă.');
    await expect(page.locator('#varsta .tbc')).toHaveCount(0);
    await expect(page.locator('#echipament .tbc')).toHaveCount(1);
    await expect(page.locator('#antrenori')).toContainText('Clubul e condus de antrenorul său.');
    const coach = page.locator('.coaches li');
    await expect(coach).toHaveCount(1);
    await expect(coach.locator('b')).toHaveText('Antrenor Exemplu');
    await expect(coach).toContainText('antrenor');
  });
});
