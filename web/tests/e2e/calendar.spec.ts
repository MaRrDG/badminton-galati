import { test, expect } from '@playwright/test';
import { at, pinClock } from './clock';
import { on } from './servers';

// The countdown reads the browser clock: every page runs on the pinned build date.
test.beforeEach(async ({ page }) => {
  await pinClock(page);
});

const block = (title: string) => `.evb[aria-label^="${title},"]`;

test('twelve month grids, today marked, the next event in the panel', async ({ page }) => {
  await page.goto('/calendar/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calendar competițional 2026');
  await expect(page.locator('.mo')).toHaveCount(12);
  await expect(page.locator('.evb')).toHaveCount(12);
  await expect(page.locator('[aria-current="date"]')).toHaveText('25');
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
  await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 2 zile');
  // Home, played and next are in the words too, not only in the colours.
  await expect(page.locator(block('CR U11 și CR U17'))).toHaveAttribute('aria-label', 'CR U11 și CR U17, 3–5 aprilie, Galați, acasă, s-a jucat');
  await expect(page.locator(block('CN U9 și CN U17'))).toHaveClass(/\bnext\b/);
  await expect(page.locator('#ev-competition-2026-11-27-cn-u9-cn-u17')).toContainText('urmează');
  await expect(page.locator('#ev-competition-2026-04-03-cr-u11-cr-u17')).toContainText('acasă');
});

test('the plain list holds every competition in date order', async ({ page }) => {
  await page.goto('/calendar/');
  const list = page.locator('.list');
  await expect(list.getByRole('heading', { level: 2 })).toHaveText('Toate competițiile, pe rând');
  await expect(list.getByRole('heading', { level: 3 })).toHaveText(['Primăvara, Cupele României', 'Toamna, Campionatele Naționale']);
  await expect(list.locator('li')).toHaveCount(12);
  await expect(list.locator('li time')).toHaveText([
    '13–15 mar.', '27–29 mar.', '3–5 apr.', '24–26 apr.', '8–10 mai',
    '4–6 sept.', '11–13 sept.', '18–20 sept.', '25–27 sept.', '23–25 oct.', '20–22 nov.', '27–29 nov.',
  ]);
  await expect(list.locator('#ev-competition-2026-09-04-cn-echipe-seniori')).toContainText('loc de confirmat');
});

test('wide: Tab previews an event, Enter pins it, the button restores the next one', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/');
  const ev = page.locator('.evb', { hasText: '13' }).first();
  await ev.focus();
  await expect(page.locator('.panel')).toContainText('CR U9 și CR Seniori');
  await expect(page.locator('.panel')).toContainText('S-a jucat');
  await expect(page.locator('.panel')).not.toContainText('CN U9 și CN U17');
  await page.keyboard.press('Enter');
  await expect(ev).toHaveClass(/\bon\b/);
  await expect(page).not.toHaveURL(/#ev-/); // pinned in the panel, not a jump to the list
  await expect(page.locator('[data-panel-live]')).toHaveText('CR U9 și CR Seniori, 13–15 martie, București, s-a jucat');
  await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toBeVisible();
  // Moving on previews the next block; leaving it comes back to the pinned one.
  await page.keyboard.press('Tab');
  await expect(page.locator('.panel')).toContainText('CR U15 și CR U23');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.panel')).toContainText('CR U9 și CR Seniori');
  await page.getByRole('button', { name: 'Arată următoarea competiție' }).click();
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
  await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 2 zile');
  await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toBeHidden();
  await expect(page.locator('.evb.on')).toHaveCount(0);
});

test('wide: hovering previews an event, leaving it shows the next one again', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/');
  await page.locator(block('CN U11 și CN U19')).hover();
  await expect(page.locator('.panel')).toContainText('CN U11 și CN U19');
  await expect(page.locator('.panel')).toContainText('acasă');
  await page.mouse.move(0, 0);
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
});

test('narrow: an event leads to its row in the list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/calendar/');
  await page.locator('.evb').first().click();
  await expect(page).toHaveURL(/#ev-competition-2026-03-13-cr-u9-cr-seniori$/);
  await expect(page.locator('#ev-competition-2026-03-13-cr-u9-cr-seniori')).toBeInViewport();
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
});

test('the category filter dims other events, with and without JavaScript', async ({ page, browser, baseURL }) => {
  const opacity = (p: typeof page, sel: string) => p.locator(sel).first().evaluate(e => Number(getComputedStyle(e).opacity));
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const noJs = await ctx.newPage();
  for (const p of [page, noJs]) {
    await p.goto('/calendar/');
    await p.locator('.filter label', { hasText: /^U15$/ }).click();
    await expect(p.getByRole('radio', { name: 'U15' })).toBeChecked();
    expect(await opacity(p, block('CR U9 și CR Seniori'))).toBeLessThan(1);
    expect(await opacity(p, block('CR U15 și CR U23'))).toBe(1);
    expect(await opacity(p, '#ev-competition-2026-03-13-cr-u9-cr-seniori')).toBeLessThan(1);
    expect(await opacity(p, '#ev-competition-2026-03-27-cr-u15-cr-u23')).toBe(1);
    await p.locator('.filter label', { hasText: 'Toate' }).click();
    expect(await opacity(p, block('CR U9 și CR Seniori'))).toBe(1);
  }
  await ctx.close();
});

test('without JavaScript the panel shows the next event and blocks link to the list', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/calendar/');
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
  await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 2 zile');
  await page.locator('.evb').first().click();
  await expect(page).toHaveURL(/#ev-competition-2026-03-13-cr-u9-cr-seniori$/);
  await ctx.close();
});

test('reduced motion shows the blocks without clipping', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await pinClock(page);
  await page.goto('/calendar/');
  const clips = await page.locator('.evb').evaluateAll(els => els.map(e => getComputedStyle(e).clipPath));
  expect(clips).toHaveLength(12);
  expect(new Set(clips)).toEqual(new Set(['none']));
  await ctx.close();
});

test('the blocks fill in on load and end unclipped', async ({ page }) => {
  await page.goto('/calendar/');
  await expect.poll(() => page.locator('.evb').last().evaluate(e => getComputedStyle(e).clipPath)).toBe('none');
  const clips = await page.locator('.evb').evaluateAll(els => els.map(e => getComputedStyle(e).clipPath));
  expect(new Set(clips)).toEqual(new Set(['none']));
});

test('plain days are hidden from screen readers; today and the blocks are not', async ({ page }) => {
  await page.goto('/calendar/');
  await expect(page.locator('.d:not([aria-hidden="true"])')).toHaveText(['25']);
  await expect(page.locator('.evb[aria-hidden]')).toHaveCount(0);
});

test('a modified click leaves the link to the browser', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/');
  const popup = page.context().waitForEvent('page');
  await page.locator(block('CR U9 și CR Seniori')).click({ modifiers: ['ControlOrMeta'] });
  await (await popup).close();
  await page.mouse.move(0, 0); // leave the block, so the panel shows what is pinned
  await expect(page.locator('.evb.on')).toHaveCount(0);
  await expect(page).not.toHaveURL(/#ev-/);
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
});

test('pinning the same event twice is announced twice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/');
  await page.evaluate(() => {
    const live = document.querySelector('[data-panel-live]')!;
    (window as unknown as { said: string[] }).said = [];
    new MutationObserver(() => (window as unknown as { said: string[] }).said.push(live.textContent ?? '')).observe(live, { childList: true, characterData: true, subtree: true });
  });
  const ev = page.locator(block('CR U9 și CR Seniori'));
  await ev.click();
  await expect(page.locator('[data-panel-live]')).not.toBeEmpty();
  await ev.click();
  const label = 'CR U9 și CR Seniori, 13–15 martie, București, s-a jucat';
  await expect.poll(() => page.evaluate(() => (window as unknown as { said: string[] }).said.filter(Boolean))).toEqual([label, label]);
});

test('a fault in the today logic leaves the panel and the motion working', async ({ page }) => {
  // The first date lookup (initCalendarToday's) throws; later ones (the countdown's) work.
  await page.addInitScript(() => {
    const real = Intl.DateTimeFormat.prototype.formatToParts;
    let first = true;
    Intl.DateTimeFormat.prototype.formatToParts = function (this: Intl.DateTimeFormat, d?: Date | number) {
      if (first) { first = false; throw new Error('test fault'); }
      return real.call(this, d);
    };
  });
  const errors: string[] = [];
  const logged: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') logged.push(m.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  const moments = page.waitForResponse(r => r.url().includes('/page-moments.'));
  await page.goto('/calendar/');
  // The blocks still fill in (the motion is fetched and runs) and end unclipped.
  await moments;
  await expect(page.locator('.months .evb').first()).toHaveCSS('clip-path', 'none');
  await page.locator('.evb', { hasText: '13' }).first().click();
  await expect(page.locator('[data-panel-live]')).toHaveText('CR U9 și CR Seniori, 13–15 martie, București, s-a jucat');
  expect(errors).toEqual([]);
  expect(logged.some(t => t.includes('test fault'))).toBe(true);
});

test.describe('a page built days before it is read', () => {
  test('with the clock on the build date nothing changes', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await pinClock(page);
    const html = await (await page.goto('/calendar/'))!.text();
    const built = await page.evaluate(source => {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      return ['.months', '.list', '.legend'].map(s => doc.querySelector(s)!.innerHTML);
    }, html);
    const live = await page.evaluate(() => ['.months', '.list', '.legend'].map(s => document.querySelector(s)!.innerHTML));
    expect(live).toEqual(built);
    await expect(page.locator('.cal')).toHaveAttribute('data-today', '2026-11-25');
    await ctx.close();
  });

  test('after the next event has ended: everything played, season over', async ({ page }) => {
    await page.clock.setSystemTime(at('2026-11-30'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar/');
    await expect(page.locator('.panel')).toContainText('Nicio competiție programată deocamdată.');
    await expect(page.locator('.panel')).not.toContainText('CN U9 și CN U17');
    await expect(page.locator('[aria-current="date"]')).toHaveText('30');
    await expect(page.locator('.legend')).toContainText('azi, 30 noiembrie');
    await expect(page.locator('[data-legend="upcoming"]')).toBeHidden();
    await expect(page.locator('.evb.next, .evb.upcoming, .li.next, .li.upcoming')).toHaveCount(0);
    await expect(page.locator(block('CN U9 și CN U17'))).toHaveAttribute('aria-label', 'CN U9 și CN U17, 27–29 noiembrie, București, s-a jucat');
    await expect(page.locator('#ev-competition-2026-11-27-cn-u9-cn-u17 .st')).toHaveText('s-a jucat');
    // Pinning still works, with no "next" to return to.
    await page.locator(block('CN U9 și CN U17')).click();
    await expect(page.locator('.panel')).toContainText('S-a jucat');
    await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toHaveCount(0);
  });

  test('a date in another month: the mark, the legend, the statuses and the next event move', async ({ page }) => {
    await page.clock.setSystemTime(at('2026-10-01'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar/');
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
    await expect(page.locator('.mo[data-ym="2026-10"] [aria-current="date"]')).toHaveText('1');
    await expect(page.locator('.mo[data-ym="2026-11"] .d.today')).toHaveCount(0);
    await expect(page.locator('.legend')).toContainText('azi, 1 octombrie');
    await expect(page.locator('.panel')).toContainText('CN U11 și CN U19');
    await expect(page.locator('.panel')).toContainText('acasă');
    await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 22 de zile');
    await expect(page.locator(block('CN U11 și CN U19'))).toHaveClass(/\bnext\b/);
    await expect(page.locator(block('CN U9 și CN U17'))).toHaveClass(/\bupcoming\b/);
    await expect(page.locator(block('CN U13 și CN U23'))).toHaveClass(/\bplayed\b/);
    await expect(page.locator(block('CN U15 și CN Seniori'))).toHaveAttribute('aria-label', /, urmează$/);
    await expect(page.locator('#ev-competition-2026-10-23-cn-u11-cn-u19')).toHaveClass(/\bnext\b/);
    await expect(page.locator('#ev-competition-2026-10-23-cn-u11-cn-u19 .st')).toHaveText('urmează');
    // The panel's way back leads to the new next event.
    await page.locator(block('CR U9 și CR Seniori')).click();
    await page.getByRole('button', { name: 'Arată următoarea competiție' }).click();
    await expect(page.locator('.panel')).toContainText('CN U11 și CN U19');
    await expect(page.locator(block('CN U11 și CN U19'))).toBeFocused();
  });
});

test('no overflow at 390 and 1440', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/calendar/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
});

test.describe('season over', on('quiet-season'), () => {
  test('the panel says so; a played event links its article', async ({ page }) => {
    await page.goto('/calendar/');
    await expect(page.locator('.panel')).toContainText('Nicio competiție programată deocamdată.');
    await expect(page.locator('#ev-competition-2026-03-27-cr-u15-cr-u23').getByRole('link', { name: 'Articolul clubului' }))
      .toHaveAttribute('href', '/noutati/articol-de-test-cu-galerie/');
    // No categories in this season: no filter; nothing is next.
    await expect(page.locator('.filter')).toHaveCount(0);
    await expect(page.locator('.evb.next, .evb.upcoming')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toHaveCount(0);
  });

  test('competitions sharing days share a block; the panel switches between them', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar/');
    const shared = page.locator(block('CR U15 și CR U23'));
    await expect(shared).toHaveAttribute('aria-label', 'CR U15 și CR U23, 27–29 martie, București, s-a jucat; Turneu de test pentru juniori, cu probe de simplu, dublu și dublu mixt, 28 martie, București, s-a jucat');
    await shared.click();
    const panel = page.locator('.panel');
    await expect(panel).toContainText('CR U15 și CR U23');
    await panel.getByRole('button', { name: 'Turneu de test pentru juniori, cu probe de simplu, dublu și dublu mixt' }).click();
    await expect(panel.locator('.pt')).toHaveText('Turneu de test pentru juniori, cu probe de simplu, dublu și dublu mixt');
    await expect(panel.getByRole('button', { name: 'CR U15 și CR U23' })).toBeFocused();
    await expect(page.locator('[data-panel-live]')).toHaveText('Turneu de test pentru juniori, cu probe de simplu, dublu și dublu mixt, 28 martie, București, s-a jucat');
    await panel.getByRole('button', { name: 'CR U15 și CR U23' }).click();
    await expect(panel.locator('.pt')).toHaveText('CR U15 și CR U23');
  });

  // Two list columns from 861px leave little room: there the city goes under the title (as at
  // 420px and below), so a long title and a home row's city with its tag never squeeze each other.
  test('list rows keep the title wide where the two list columns are narrow', async ({ page }) => {
    const rows = () => page.locator('.li').evaluateAll(els => els.map(e => {
      const t = e.querySelector('.lt')!.getBoundingClientRect();
      const c = e.querySelector('.lc')!.getBoundingClientRect();
      return { title: e.querySelector('.lt')!.textContent!, width: t.width, below: c.top >= t.bottom - 1 };
    }));
    for (const width of [861, 1000]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/calendar/');
      for (const r of await rows()) {
        expect(r.below, `${width}: city under "${r.title}"`).toBe(true);
        expect(r.width, `${width}: width of "${r.title}"`).toBeGreaterThanOrEqual(220);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar/');
    expect((await rows()).every(r => !r.below)).toBe(true);
  });

  test('pinning a played event shows its article in the panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar/');
    await page.locator(block('CR U15 și CR U23')).click();
    await expect(page.locator('.panel').getByRole('link', { name: 'Articolul clubului' })).toHaveAttribute('href', '/noutati/articol-de-test-cu-galerie/');
  });
});

test.describe('no competition at all', on('sparse'), () => {
  test('one quiet line, no empty grids', async ({ page }) => {
    await page.goto('/calendar/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calendar competițional 2026');
    await expect(page.locator('.mo, .filter, .list, .evb')).toHaveCount(0);
    await expect(page.getByText('Nicio competiție programată deocamdată.')).toBeVisible();
    await expect(page.locator('.head p')).toHaveText(/toamna\.$/);
    await expect(page.getByText('Apasă pe o competiție')).toHaveCount(0);
  });
});
