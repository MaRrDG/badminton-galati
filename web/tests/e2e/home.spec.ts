import { test, expect, type Page } from '@playwright/test';
import { at, pinClock } from './clock';
import { on } from './servers';

// The countdown script reads the browser clock, so every page runs on the pinned build date
// unless a test sets another day; otherwise assertions would change with the real date.
test.beforeEach(async ({ page }) => {
  await pinClock(page);
});

/** Left and right edges of the text inside each element (not of its block box). */
function textEdges(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(els => els.map(e => {
    const range = document.createRange();
    range.selectNodeContents(e);
    const r = range.getBoundingClientRect();
    return { text: e.textContent!.trim(), left: r.left, right: r.right };
  }));
}

test('hero carries the club motto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Ai reușit\?\s*Continuă!\s*N-ai reușit\?\s*Continuă!/);
  await expect(page.locator('.hero')).not.toContainText('Locul');
});

test('roster names its source', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sportivi')).toContainText('Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026');
});

/** The id of each section in <main>, or its first class when it has none. */
const sectionIds = (page: Page) =>
  page.locator('main > section').evaluateAll(s => s.map(e => e.id || e.className.split(' ')[0]));

test('sections appear in the agreed order', async ({ page }) => {
  await page.goto('/');
  expect(await sectionIds(page)).toEqual(['hero', 'de-ce', 'program', 'calendar', 'sportivi', 'hall', 'noutati', 'proba']);
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
  // An empty alt is allowed only on an image marked decorative (data-decorative), and such an
  // image must have exactly alt="".
  const imgs = await page.locator('img').evaluateAll(i => i.map(e => ({
    src: e.getAttribute('src'), width: e.getAttribute('width'), height: e.getAttribute('height'),
    alt: e.getAttribute('alt'), decorative: e.hasAttribute('data-decorative'),
  })));
  expect(imgs.filter(i => i.decorative).length).toBeGreaterThan(0);
  for (const img of imgs) {
    expect(img.width && img.height, `${img.src} size`).toBeTruthy();
    if (img.decorative) expect(img.alt, `${img.src} is decorative`).toBe('');
    else expect(img.alt?.trim(), `${img.src} alt`).toBeTruthy();
  }
});

test('the hero photo loads first, everything below the fold waits', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.hero img');
  await expect(hero).toHaveAttribute('fetchpriority', 'high');
  await expect(hero).toHaveAttribute('loading', 'eager');
  const below = await page.locator('main > section:not(.hero) img').evaluateAll(imgs =>
    imgs.map(i => ({ src: i.getAttribute('src'), loading: i.getAttribute('loading'), decoding: i.getAttribute('decoding') })));
  expect(below.length).toBeGreaterThan(8);
  for (const img of below) expect(img, img.src!).toMatchObject({ loading: 'lazy', decoding: 'async' });
});

test('the homepage draws every red plate with one component', async ({ page }) => {
  await page.goto('/');
  // Hero, why, the third hall photo and the news cover.
  await expect(page.locator('main .plated > .plate')).toHaveCount(4);
  const shadowed = await page.locator('main *').evaluateAll(els =>
    els.filter(e => getComputedStyle(e).boxShadow !== 'none').map(e => e.outerHTML.slice(0, 80)));
  expect(shadowed).toEqual([]);
});

test('the plate under a hall photo gives the strip no vertical scroll', async ({ browser }) => {
  // Without the motion layer (reduced motion, no JS) the strip is a sideways scroller of its own.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' }); const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('.hall .track .plated')).toHaveCount(1);
  const { scrollHeight, clientHeight } = await page.locator('.hall .track').evaluate(t => ({ scrollHeight: t.scrollHeight, clientHeight: t.clientHeight }));
  expect(scrollHeight).toBe(clientHeight);
  await ctx.close();
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
  // Sections clip sideways overflow, so scrollWidth alone would not catch cut-off text.
  // The hero lines slide in on load, so measure them once they have settled.
  await expect.poll(() => page.locator('.hero h1 span').evaluateAll(spans => spans.every(s => {
    const cs = getComputedStyle(s);
    return new DOMMatrix(cs.transform).isIdentity && cs.opacity === '1';
  }))).toBe(true);
  const edges = [...await textEdges(page, '.hero h1 span'), ...await textEdges(page, '#sportivi h3')];
  expect(edges).toHaveLength(4 + 3);
  for (const e of edges) {
    expect(e.left, e.text).toBeGreaterThanOrEqual(0);
    expect(e.right, e.text).toBeLessThanOrEqual(width);
  }
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
  for (const [day, label] of [['2026-11-26', 'începe mâine'], ['2026-11-27', 'începe azi'], ['2026-11-28', 'în desfășurare']])
    test(`on ${day} it reads "${label}"`, async ({ page }) => {
      await page.clock.setSystemTime(at(day));
      await page.goto('/');
      await expect(page.locator('#calendar [data-countdown]')).toHaveText(label);
    });

  test('after the event it disappears', async ({ page }) => {
    await page.clock.setSystemTime(at('2026-11-30'));
    await page.goto('/');
    await expect(page.locator('#calendar [data-countdown]')).toBeHidden();
  });
});

test.describe('a season with no competition left', on('quiet-season'), () => {
  test('shows three played events and no countdown', async ({ page }) => {
    await page.goto('/');
    const cal = page.locator('#calendar');
    await expect(cal.locator('.played li')).toHaveCount(3);
    await expect(cal.locator('.played li', { hasText: 'jucat' })).toHaveCount(3);
    await expect(cal.locator('[data-countdown]')).toHaveCount(0);
    await expect(cal).not.toContainText(/peste -?\d+ (de )?zile/);
  });
});

test.describe('athletes without rankings', on('quiet-season'), () => {
  test('roster shows names and FRB links, no places and no source line', async ({ page }) => {
    await page.goto('/');
    const roster = page.locator('#sportivi');
    await expect(roster).not.toContainText('Clasamentul FRB');
    for (const name of ['Nistor Cristian-Ionuț', 'Pazargic Ligia-Beatrice', 'Bordeianu Nectarie-Ioan'])
      await expect(roster.getByRole('heading', { name })).toBeVisible();
    await expect(roster.getByRole('link', { name: 'Profilul FRB' })).toHaveCount(3);
    await expect(page.locator('[data-roll]')).toHaveCount(0);
  });

  test('without places no athlete gets a larger row', async ({ page }) => {
    await page.goto('/');
    const sizes = await page.locator('#sportivi h3').evaluateAll(hs => hs.map(h => getComputedStyle(h).fontSize));
    expect(sizes).toHaveLength(3);
    expect(new Set(sizes).size).toBe(1);
  });
});

test.describe('no athlete may be shown', on('sparse'), () => {
  test('the roster and every link to it are left out', async ({ page }) => {
    const html = await (await page.goto('/'))!.text();
    await expect(page.locator('#sportivi')).toHaveCount(0);
    await expect(page.locator('a[href="#sportivi"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Vezi toți sportivii' })).toHaveCount(0);
    expect(html).not.toContain('Fără-Acord');
  });

  test('the other sections keep their order', async ({ page }) => {
    await page.goto('/');
    expect(await sectionIds(page)).toEqual(['hero', 'de-ce', 'program', 'calendar', 'hall', 'noutati', 'proba']);
  });

  test('an empty calendar is one quiet line', async ({ page }) => {
    await page.goto('/');
    const cal = page.locator('#calendar');
    await expect(cal.getByText('Nicio competiție programată deocamdată.')).toBeVisible();
    await expect(cal.locator('.nextev, .played, [data-countdown]')).toHaveCount(0);
    await expect(cal.getByRole('link', { name: 'Tot calendarul 2026' })).toHaveAttribute('href', '/calendar/');
  });

  test('a long hero line wraps inside a 380px screen', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 }); await page.goto('/');
    await expect(page.locator('.hero h1 span').first()).toHaveText('Ai pierdut? Încearcă');
    await expect.poll(() => page.locator('.hero h1 span').evaluateAll(spans => spans.every(s => {
      const cs = getComputedStyle(s);
      return new DOMMatrix(cs.transform).isIdentity && cs.opacity === '1';
    }))).toBe(true);
    for (const e of await textEdges(page, '.hero h1 span')) {
      expect(e.left, e.text).toBeGreaterThanOrEqual(0);
      expect(e.right, e.text).toBeLessThanOrEqual(380);
    }
  });

  test('the hero scrub still moves wrapped lines', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 }); await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => scrollTo(0, 300)); await page.waitForTimeout(1000);
    const x = (sel: string) => page.evaluate(s => new DOMMatrix(getComputedStyle(document.querySelector(s)!).transform).m41, sel);
    expect(await x('.hero .l1')).toBeLessThan(-2);
    expect(await x('.hero .l2')).toBeGreaterThan(2);
  });
});

test.describe('a roster with a single ranked athlete', on('mixed-strip'), () => {
  test('an athlete without consent appears nowhere, even with the top place', async ({ page }) => {
    const html = await (await page.goto('/'))!.text();
    expect(html).not.toContain('Fără-Acord');
    expect(html).not.toContain('fara-acord');
    expect(html).not.toContain('jucator/999/');
    await expect(page.locator('#sportivi [data-roll]').first()).toHaveAttribute('data-roll', '2');
  });

  test('the unranked athletes after it get small rows, not the medium pair', async ({ page }) => {
    await page.goto('/');
    const roster = page.locator('#sportivi');
    await expect(roster.locator('[data-roll]')).toHaveCount(1);
    await expect(roster.locator('.pair, .second')).toHaveCount(0);
    const size = (name: string) => roster.getByRole('heading', { name }).evaluate(h => parseFloat(getComputedStyle(h).fontSize));
    const [first, b, c] = [await size('Nistor Cristian-Ionuț'), await size('Bordeianu Nectarie-Ioan'), await size('Pazargic Ligia-Beatrice')];
    expect(b).toBe(c);
    expect(b).toBeLessThan(first);
    // The compact rows of a ranked roster (.third), not the medium second-place row.
    expect(b).toBeLessThanOrEqual(1.6 * 16);
  });
});
