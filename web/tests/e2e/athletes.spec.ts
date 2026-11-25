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

test.describe('an athlete profile', () => {
  test('a profile states place, source and what is not known yet', async ({ page }) => {
    await page.goto('/sportivi/nistor-cristian-ionut/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Nistor\s+Cristian-Ionuț/);
    await expect(page.locator('.facts')).toContainText('Grupa');
    await expect(page.locator('.facts')).toContainText('de confirmat');
    await expect(page.locator('.facts dt')).toHaveText(['Categoria', 'Proba', 'Grupa']);
    await expect(page.locator('.facts dd')).toHaveText(['U17', 'Simplu băieți', 'de confirmat']);
    await expect(page.locator('.standing')).toContainText('Locul 2 în țară la U17, simplu băieți, cu 168 de puncte');
    await expect(page.locator('.standing')).toContainText('Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026');
    await expect(page.getByRole('link', { name: 'Profilul FRB' }).first()).toHaveAttribute('href', 'https://badminton.ro/jucator/236/u17-sb-simplu-baieti/');
    await expect(page.getByRole('link', { name: 'Toți sportivii' })).toHaveAttribute('href', '/sportivi/');
    await expect(page.getByText('Apar aici după prima sincronizare cu clasamentul FRB.')).toBeVisible();
    await expect(page.getByText('Încă nu are medalii trecute în articolele clubului.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Apare în articolele clubului' })).toHaveCount(0);
    // No photo yet: the initials on a coloured field, the same colour as the tile on the wall.
    await expect(page.locator('.ident .ini')).toHaveText('NC');
    await expect(page.locator('.ident .initial')).toHaveClass(/c-blue/);
  });

  test('the place rolls on load and is not read twice', async ({ page }) => {
    await page.goto('/sportivi/nistor-cristian-ionut/');
    await expect(page.locator('.standing [data-roll] i')).toHaveCount(1); // the motion layer built its digit cell
    await expect(page.locator('.standing .num')).toHaveAttribute('aria-hidden', 'true');
  });

  test('the longest name fits a 380px screen', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width: 380, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/sportivi/bordeianu-nectarie-ioan/');
    const lines = page.locator('h1 span');
    await expect(lines).toHaveText(['Bordeianu', 'Nectarie-Ioan']);
    for (const line of await lines.all()) {
      const box = await line.evaluate(el => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const b = r.getBoundingClientRect();
        return { left: b.left, right: b.right };
      });
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(380);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ctx.close();
  });

  test('reduced motion and no-JS show the place as text', async ({ browser, baseURL }) => {
    for (const options of [{ reducedMotion: 'reduce' as const }, { javaScriptEnabled: false }]) {
      const ctx = await browser.newContext({ baseURL, ...options });
      const page = await ctx.newPage();
      await page.goto('/sportivi/nistor-cristian-ionut/');
      await expect(page.locator('[data-roll]')).toHaveText('2');
      await ctx.close();
    }
  });
});

test.describe('medals and articles', on('quiet-season'), () => {
  test('a medal from an article links to it, and the article is listed', async ({ page }) => {
    await page.goto('/sportivi/zet-exemplu-ana/');
    const medals = page.locator('.medals li');
    await expect(medals).toHaveText(['2026: aur, simplu fete – Articol de test cu galerie']);
    await expect(medals.getByRole('link')).toHaveAttribute('href', '/noutati/articol-de-test-cu-galerie/');
    await expect(page.getByText('Încă nu are medalii')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Apare în articolele clubului' })).toBeVisible();
    const article = page.locator('.arts a');
    await expect(article).toHaveAttribute('href', '/noutati/articol-de-test-cu-galerie/');
    await expect(article).toContainText('30 martie 2026');
    await expect(article).toContainText('Articol de test cu galerie');
  });

  test('a photo, a group and no place', async ({ page }) => {
    await page.goto('/sportivi/zet-exemplu-ana/');
    const img = page.locator('.ident img');
    await expect(img).toHaveAttribute('fetchpriority', 'high');
    await expect(img).toHaveCSS('object-position', '50% 18%');
    await expect(page.locator('.facts dd')).toHaveText(['U13', 'Inițiere']);
    await expect(page.locator('.standing, [data-roll]')).toHaveCount(0);
    // No FRB profile: the tournaments line ends without the link.
    await expect(page.getByRole('link', { name: 'Profilul FRB' })).toHaveCount(0);
    await expect(page.getByText('Apar aici după prima sincronizare cu clasamentul FRB.', { exact: true })).toBeVisible();
  });

  test('without a photo or a place, the initials and nothing loud', async ({ page }) => {
    await page.goto('/sportivi/nistor-cristian-ionut/');
    await expect(page.locator('.facts dd')).toHaveText(['de confirmat', 'de confirmat']);
    await expect(page.locator('.facts dt')).toHaveText(['Categoria', 'Grupa']);
    await expect(page.locator('.standing')).toHaveCount(0);
    await expect(page.locator('.ident .ini')).toHaveText('NC');
    await expect(page.getByRole('link', { name: 'Profilul FRB' })).toHaveCount(2);
  });
});

test.describe('no consent, no page', on('mixed-strip'), () => {
  test('the address answers 404', async ({ page }) => {
    expect((await page.goto('/sportivi/fara-acord-zamfira/'))!.status()).toBe(404);
  });
});
