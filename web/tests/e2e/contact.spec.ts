import { test, expect, type Page, type Route } from '@playwright/test';
import { on } from './servers';

const EMAIL = 'siderurgistul@badmintongalati.ro';
const MAP = 'https://www.google.com/maps/search/?api=1&query=45.4194907,28.0277769';
const SUBJECT = encodeURIComponent('Cerere antrenament de probă');
const send = (page: Page) => page.getByRole('button', { name: 'Trimite cererea' }).click();
const summary = (page: Page) => page.locator('.errsum');
const sent = (page: Page) => page.locator('.sent');
const mailBody = (...lines: string[]) => lines.map(encodeURIComponent).join('%0D%0A');

async function fillGood(page: Page) {
  await page.getByLabel('Numele părintelui').fill('Ana Ionescu');
  await page.getByLabel('Telefon', { exact: true }).fill('+40 745-123-456');
  await page.getByLabel('Vârsta copilului').fill('8');
  await page.getByLabel(/Sunt de acord/).check();
}

/** Mailto navigations are caught before they leave the page; the last one is kept in `__mailto`. */
async function catchMailto(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener(
      'click',
      e => {
        const a = (e.target as Element | null)?.closest?.('a[href^="mailto:"]');
        if (!a) return;
        e.preventDefault();
        (window as unknown as { __mailto: string }).__mailto = (a as HTMLAnchorElement).href;
      },
      true,
    );
  });
}
const lastMailto = (page: Page) => page.evaluate(() => (window as unknown as { __mailto?: string }).__mailto);

/** Records every request to the endpoint (there must be none while it is not configured). */
function endpointCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', req => {
    if (new URL(req.url()).pathname.startsWith('/api/')) calls.push(`${req.method()} ${req.url()}`);
  });
  return calls;
}

/**
 * The fixture servers build without TRIAL_ENDPOINT. For the endpoint path, the served page is
 * given the attribute such a build writes (`data-endpoint` on the form) and the endpoint's
 * answer is mocked.
 */
async function withEndpoint(page: Page, answer: (r: Route) => Promise<void> | void) {
  await page.route('**/contact/', async route => {
    const res = await route.fetch();
    const html = (await res.text()).replace(/<form([^>]*?)\sdata-trial/, '<form$1 data-trial data-endpoint="/api/proba"');
    await route.fulfill({ response: res, body: html });
  });
  await page.route('**/api/proba', answer);
}
const ok = (r: Route) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });

test.describe('the error state', () => {
  test('an empty form explains every missing field and links to it', async ({ page }) => {
    await page.goto('/contact/');
    await send(page);
    const sum = summary(page);
    await expect(sum).toBeFocused();
    await expect(sum).toContainText('Cererea nu a plecat');
    await expect(sum).toContainText('Verificați patru lucruri:');
    await expect(sum.getByRole('link')).toHaveText(['Lipsește numele părintelui', 'Lipsește telefonul', 'Lipsește vârsta copilului', 'Lipsește acordul pentru date']);
    // Focus announces it; no live role on top of that.
    await expect(page.locator('[role="alert"], [role="status"]')).toHaveCount(0);
    await sum.getByRole('link', { name: 'Lipsește telefonul' }).click();
    const tel = page.getByLabel('Telefon', { exact: true });
    await expect(tel).toBeFocused();
    await expect(tel).toHaveAttribute('aria-invalid', 'true');
    await expect(tel).toHaveAttribute('aria-describedby', 'f-tel-h f-tel-err');
    await expect(page.locator('#f-tel-err')).toHaveText('Eroare: Scrieți un număr la care vă poate suna clubul.');
    await expect(page.locator('#f-mesaj')).not.toHaveAttribute('aria-invalid');
    await expect(page.locator('[data-field="acord"]')).toHaveClass(/\bbad\b/);
  });

  test('a short phone and a missing consent are the two things to check', async ({ page }) => {
    await catchMailto(page);
    await page.goto('/contact/');
    await fillGood(page);
    await page.getByLabel('Telefon', { exact: true }).fill('0745 12');
    await page.getByLabel(/Sunt de acord/).uncheck();
    await send(page);
    const sum = summary(page);
    await expect(sum).toContainText('Verificați două lucruri:');
    await expect(sum.getByRole('link')).toHaveText(['Telefonul are prea puține cifre', 'Lipsește acordul pentru date']);
    await expect(page.locator('#f-acord')).toHaveAttribute('aria-describedby', 'f-acord-err');
    await expect(page.getByLabel('Numele părintelui')).not.toHaveAttribute('aria-invalid');

    // Fixing them clears the old marks before the request goes.
    await page.getByLabel('Telefon', { exact: true }).fill('+40 (0)745 123 456');
    await page.getByLabel(/Sunt de acord/).check();
    await send(page);
    await expect(sent(page)).toContainText('Am deschis un e-mail către club');
    await expect(page.locator('[aria-invalid]')).toHaveCount(0);
  });
});

test.describe('without an endpoint (every build until plan 2b)', () => {
  test('a child request opens a pre-filled e-mail at once, and nothing goes over the network', async ({ page }) => {
    await catchMailto(page);
    const calls = endpointCalls(page);
    await page.goto('/contact/');
    await expect(page.locator('form[data-trial]')).not.toHaveAttribute('data-endpoint');
    await fillGood(page);
    await page.getByLabel(/Mesaj/).fill('Joi după-amiaza.');
    await send(page);
    const box = sent(page);
    await expect(box.getByRole('heading', { name: 'Am deschis un e-mail către club' })).toBeFocused();
    await expect(box).toContainText('Ajunge la club după ce apăsați „Trimite” în aplicația de e-mail');
    await expect(box).not.toContainText('a ajuns la club');
    await expect(page.locator('form.trial')).toBeHidden();

    const expected =
      `mailto:${EMAIL}?subject=${SUBJECT}&body=` +
      mailBody('Numele părintelui: Ana Ionescu', 'Telefon: 0745 123 456', 'Vârsta copilului: 8 ani', 'Mesaj: Joi după-amiaza.');
    expect(await lastMailto(page)).toBe(expected); // opened inside the submit, nothing awaited
    await expect(box.getByRole('link', { name: 'Trimiteți-o pe e-mail' })).toHaveAttribute('href', expected);
    expect(calls).toEqual([]);

    await box.getByRole('button', { name: 'Trimite altă cerere' }).click();
    await expect(page.getByLabel('Copilul meu')).toBeFocused();
    await expect(page.getByLabel('Numele părintelui')).toHaveValue('');
    await expect(sent(page)).toBeHidden();
  });

  test('an adult asking for themself gives no age, and the e-mail says who comes', async ({ page }) => {
    await catchMailto(page);
    const calls = endpointCalls(page);
    await page.goto('/contact/');
    await expect(page.getByRole('group', { name: 'Cine vine la antrenament?' })).toBeVisible();
    await page.getByLabel('Eu', { exact: true }).check();
    await expect(page.getByLabel('Vârsta copilului')).toBeHidden();
    await expect(page.locator('#f-nume')).toHaveAccessibleName('Numele dumneavoastră');
    await page.getByLabel('Numele dumneavoastră').fill('Dan Popa');
    await page.getByLabel('Telefon', { exact: true }).fill('0745 123 456');
    await page.getByLabel(/Sunt de acord/).check();
    await send(page);
    await expect(sent(page)).toContainText('Am deschis un e-mail către club');
    expect(await lastMailto(page)).toBe(
      `mailto:${EMAIL}?subject=${SUBJECT}&body=` + mailBody('Vine la antrenament: chiar eu', 'Nume: Dan Popa', 'Telefon: 0745 123 456'),
    );
    expect(calls).toEqual([]);
  });

  test('an adult with an empty form is not asked for an age', async ({ page }) => {
    await page.goto('/contact/');
    await page.getByLabel('Eu', { exact: true }).check();
    await send(page);
    await expect(summary(page).getByRole('link')).toHaveText(['Lipsește numele', 'Lipsește telefonul', 'Lipsește acordul pentru date']);
    // Back to the child path: the age is asked for again.
    await page.getByLabel('Copilul meu').check();
    await expect(page.getByLabel('Vârsta copilului')).toBeVisible();
    await send(page);
    await expect(summary(page).getByRole('link')).toHaveText(['Lipsește numele părintelui', 'Lipsește telefonul', 'Lipsește vârsta copilului', 'Lipsește acordul pentru date']);
  });
});

test.describe('with an endpoint (plan 2b)', () => {
  test('the club has the request only when the endpoint says ok', async ({ page }) => {
    await withEndpoint(page, ok);
    await page.goto('/contact/');
    await fillGood(page);
    await send(page);
    const box = sent(page);
    await expect(box.getByRole('heading', { name: 'Cererea a ajuns la club' })).toBeFocused();
    await expect(box).toContainText('Mulțumim, Ana Ionescu. Clubul vă contactează la 0745 123 456 ca să stabiliți ziua probei.');
    await expect(box.locator('.tbc')).toContainText('De confirmat de club: în câte zile răspundeți');
    await expect(box.getByRole('link', { name: 'ce e bine să știți înainte de primul antrenament' })).toHaveAttribute('href', '/pentru-parinti/');
    await expect(page.locator('[role="alert"], [role="status"]')).toHaveCount(0);
  });

  for (const [what, answer] of [
    ['a network error', (r: Route) => r.abort()],
    ['a server error', (r: Route) => r.fulfill({ status: 500 })],
    ['a missing endpoint', (r: Route) => r.fulfill({ status: 404 })],
    ['a 200 without ok', (r: Route) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>Contact</p>' })],
  ] as const) {
    test(`after ${what} the request can still go by e-mail`, async ({ page }) => {
      await withEndpoint(page, answer);
      await page.goto('/contact/');
      await fillGood(page);
      await send(page);
      const sum = summary(page);
      await expect(sum).toBeFocused();
      await expect(sum).toContainText('Cererea nu a putut fi trimisă de pe site.');
      await expect(sum.getByRole('link', { name: 'Trimiteți-o pe e-mail' })).toHaveAttribute('href', new RegExp(`^mailto:${EMAIL.replace(/\./g, '\\.')}\\?subject=`));
      await expect(sent(page)).toBeHidden();
      await expect(page.locator('form.trial')).toBeVisible();
    });
  }

  test('server-side errors come back into the same summary', async ({ page }) => {
    await withEndpoint(page, r =>
      r.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, errors: [{ field: 'telefon', summary: 'Telefonul nu pare corect', message: 'Scrieți-l cu 10 cifre, de exemplu 0745 123 456.' }] }),
      }),
    );
    await page.goto('/contact/');
    await fillGood(page);
    await send(page);
    await expect(summary(page)).toBeFocused();
    await expect(summary(page).getByRole('link')).toHaveText(['Telefonul nu pare corect']);
    await expect(page.getByLabel('Telefon', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  });

  test('too many requests asks to wait', async ({ page }) => {
    await withEndpoint(page, r => r.fulfill({ status: 429 }));
    await page.goto('/contact/');
    await fillGood(page);
    await send(page);
    await expect(summary(page)).toContainText('Ați trimis deja câteva cereri. Încercați din nou peste câteva minute.');
  });
});

test('the form can be filled and sent with the keyboard alone', async ({ page }) => {
  await catchMailto(page);
  await page.goto('/contact/');
  const active = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  for (let i = 0; i < 30 && (await active()) !== 'f-cine-copil'; i++) await page.keyboard.press('Tab');
  expect(await active()).toBe('f-cine-copil');
  await page.keyboard.press('Tab'); // one stop for the radio group
  expect(await active()).toBe('f-nume');
  await page.keyboard.type('Ana Ionescu');
  await page.keyboard.press('Tab');
  expect(await active()).toBe('f-tel');
  await page.keyboard.type('0745 123 456');
  await page.keyboard.press('Tab');
  expect(await active()).toBe('f-varsta');
  await page.keyboard.type('8');
  await page.keyboard.press('Tab');
  expect(await active()).toBe('f-mesaj');
  await page.keyboard.press('Tab');
  expect(await active()).toBe('f-acord');
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab'); // the honeypot is skipped
  expect(await active()).toBe('BUTTON');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Am deschis un e-mail către club' })).toBeFocused();
  expect(await lastMailto(page)).toMatch(/^mailto:/);
});

test('every field has a visible label above it, the right input type and a large target', async ({ page }) => {
  await page.goto('/contact/');
  for (const [id, label, attrs] of [
    ['f-nume', 'Numele părintelui', { type: 'text', autocomplete: 'name', required: '' }],
    ['f-tel', 'Telefon', { type: 'tel', autocomplete: 'tel', required: '', 'aria-describedby': 'f-tel-h' }],
    ['f-varsta', 'Vârsta copilului', { type: 'text', inputmode: 'numeric', maxlength: '2', 'aria-describedby': 'f-varsta-h' }],
  ] as const) {
    const input = page.locator(`#${id}`);
    await expect(input).toHaveAccessibleName(label);
    for (const [k, v] of Object.entries(attrs)) await expect(input).toHaveAttribute(k, v);
    await expect(input).not.toHaveAttribute('placeholder');
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  await expect(page.locator('#f-varsta-h')).toContainText('între 3 și 18');
  await expect(page.getByLabel('Copilul meu')).toBeChecked();
  for (const name of ['Copilul meu', 'Eu']) {
    expect((await page.locator('.choices label', { hasText: new RegExp(`^\\s*${name}\\s*$`) }).boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  await expect(page.locator('#f-mesaj')).not.toHaveAttribute('required');
  await expect(page.locator('#f-acord')).toHaveAttribute('required', '');
  expect((await page.locator('#f-acord').boundingBox())!.height).toBeGreaterThanOrEqual(24);
  expect((await page.getByRole('button', { name: 'Trimite cererea' }).boundingBox())!.height).toBeGreaterThanOrEqual(48);

  // The honeypot: out of sight, out of the tab order and of the accessibility tree.
  const trap = page.locator('input[name="site_web"]');
  await expect(trap).toHaveAttribute('tabindex', '-1');
  await expect(trap).toHaveAttribute('autocomplete', 'off');
  await expect(page.locator('div[aria-hidden="true"]:has(> input[name="site_web"])')).toHaveClass(/visually-hidden/);
  await expect(page.getByRole('textbox')).toHaveCount(4);
});

test('without JavaScript the browser checks the fields and the form opens an e-mail', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/contact/');
  for (const id of ['f-nume', 'f-tel', 'f-acord']) await expect(page.locator(`#${id}`)).toHaveAttribute('required', '');
  // The browser cannot require the age on one path only; it is asked for, not required.
  await expect(page.locator('#f-varsta')).not.toHaveAttribute('required');
  const form = page.locator('form.trial');
  await expect(form).toHaveAttribute('action', `mailto:${EMAIL}?subject=${SUBJECT}`);
  await expect(form).toHaveAttribute('method', 'post');
  await expect(form).toHaveAttribute('enctype', 'text/plain');
  await expect(form).not.toHaveAttribute('novalidate');
  const line = page.locator('.noscript');
  await expect(line).toBeVisible();
  await expect(line).toContainText('Fără JavaScript');
  await expect(line.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);

  // Both paths without JavaScript: choosing "Eu" hides the age and renames the name field (CSS).
  await expect(page.getByLabel('Copilul meu')).toBeChecked();
  await expect(page.getByLabel('Vârsta copilului')).toBeVisible();
  await page.getByLabel('Eu', { exact: true }).check();
  await expect(page.getByLabel('Vârsta copilului')).toBeHidden();
  await expect(page.locator('#f-nume')).toHaveAccessibleName('Numele dumneavoastră');
  await page.getByLabel('Copilul meu').check();
  await expect(page.getByLabel('Vârsta copilului')).toBeVisible();
  await expect(page.locator('#f-nume')).toHaveAccessibleName('Numele părintelui');
  await ctx.close();
});

test('the place panel: the hall photo, the map, and what is still to confirm', async ({ page }) => {
  await page.goto('/contact/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact');
  await expect(page.locator('.pagehead').getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
  const place = page.getByRole('complementary', { name: 'Sala Siderurgistul' });
  await expect(place.locator('img')).toHaveAttribute('src', '/img/sala-turneu-2.jpg'); // the club's venuePhoto
  await expect(place.getByRole('link', { name: 'Deschide harta' })).toHaveAttribute('href', MAP);
  await expect(place.locator('#drum .tbc')).toContainText('De confirmat de club:');
  await expect(place.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
  await expect(place.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(place.locator('.tbc')).toHaveCount(2);
  await expect(place.locator('.tbc').last()).toHaveCSS('color', 'rgb(255, 255, 255)');
  // The form comes before the place, also on a phone.
  const [formBox, placeBox] = await Promise.all([page.locator('#formular').boundingBox(), place.boundingBox()]);
  expect(formBox!.x <= placeBox!.x || formBox!.y < placeBox!.y).toBe(true);
});

test.describe('known contact details', on('quiet-season'), () => {
  test('the club phone, the way there and the reply time are shown', async ({ page }) => {
    await withEndpoint(page, ok);
    await page.goto('/contact/');
    const place = page.getByRole('complementary', { name: 'Sala Siderurgistul' });
    await expect(place.getByRole('link', { name: '0700 000 000' })).toHaveAttribute('href', 'tel:0700000000');
    await expect(place.locator('#drum dd')).toHaveText('Text de test pentru drum.');
    await expect(place.locator('.tbc')).toHaveCount(0);

    await fillGood(page);
    await send(page);
    await expect(sent(page)).toContainText('Vă sunăm în cel mult 3 zile.');
    await expect(sent(page).locator('.tbc')).toHaveCount(0);
  });
});

test.describe('at 380px', () => {
  test.use({ viewport: { width: 380, height: 800 } });
  test('nothing overflows: the page, the error state and the e-mail state', async ({ page }) => {
    await catchMailto(page);
    await page.goto('/contact/');
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await fits()).toBe(true);
    const button = await page.getByRole('button', { name: 'Trimite cererea' }).boundingBox();
    expect(button!.width).toBeGreaterThan(300); // full width on a phone
    await send(page);
    await expect(summary(page)).toBeVisible();
    expect(await fits()).toBe(true);
    await fillGood(page);
    await send(page);
    await expect(sent(page)).toBeVisible();
    expect(await fits()).toBe(true);
  });
});
