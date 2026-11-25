import { test, expect, type Page } from '@playwright/test';
import { on } from './servers';

const EMAIL = 'siderurgistul@badmintongalati.ro';
const MAP = 'https://www.google.com/maps/search/?api=1&query=45.4194907,28.0277769';
const send = (page: Page) => page.getByRole('button', { name: 'Trimite cererea' }).click();

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

test.describe('the error state', () => {
  test('an empty form explains every missing field and links to it', async ({ page }) => {
    await page.goto('/contact/');
    await send(page);
    const sum = page.getByRole('alert');
    await expect(sum).toBeFocused();
    await expect(sum).toContainText('Cererea nu a plecat');
    await expect(sum).toContainText('Verificați patru lucruri:');
    await expect(sum.getByRole('link')).toHaveText(['Lipsește numele părintelui', 'Lipsește telefonul', 'Lipsește vârsta copilului', 'Lipsește acordul pentru date']);
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
    await page.goto('/contact/');
    await fillGood(page);
    await page.getByLabel('Telefon', { exact: true }).fill('0745 12');
    await page.getByLabel(/Sunt de acord/).uncheck();
    await send(page);
    const sum = page.getByRole('alert');
    await expect(sum).toContainText('Verificați două lucruri:');
    await expect(sum.getByRole('link')).toHaveText(['Telefonul are prea puține cifre', 'Lipsește acordul pentru date']);
    await expect(page.locator('#f-acord')).toHaveAttribute('aria-describedby', 'f-acord-err');
    await expect(page.getByLabel('Numele părintelui')).not.toHaveAttribute('aria-invalid');

    // Fixing them clears the old marks before the request goes.
    await page.route('**/api/proba', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await page.getByLabel('Telefon', { exact: true }).fill('0745 123 456');
    await page.getByLabel(/Sunt de acord/).check();
    await send(page);
    await expect(page.getByRole('status')).toContainText('Cererea a ajuns la club');
    await expect(page.locator('[aria-invalid]')).toHaveCount(0);
  });

  test('server-side errors come back into the same summary', async ({ page }) => {
    await page.route('**/api/proba', r =>
      r.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, errors: [{ field: 'telefon', summary: 'Telefonul nu pare corect', message: 'Scrieți-l cu 10 cifre, de exemplu 0745 123 456.' }] }),
      }),
    );
    await page.goto('/contact/');
    await fillGood(page);
    await send(page);
    const sum = page.getByRole('alert');
    await expect(sum).toBeFocused();
    await expect(sum.getByRole('link')).toHaveText(['Telefonul nu pare corect']);
    await expect(page.getByLabel('Telefon', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  });

  test('too many requests asks to wait', async ({ page }) => {
    await page.route('**/api/proba', r => r.fulfill({ status: 429 }));
    await page.goto('/contact/');
    await fillGood(page);
    await send(page);
    await expect(page.getByRole('alert')).toContainText('Ați trimis deja câteva cereri. Încercați din nou peste câteva minute.');
  });

  for (const [what, answer] of [
    ['a network error', (r: Parameters<Parameters<Page['route']>[1]>[0]) => r.abort()],
    ['a server error', (r: Parameters<Parameters<Page['route']>[1]>[0]) => r.fulfill({ status: 500 })],
  ] as const) {
    test(`after ${what} the request can still go by e-mail`, async ({ page }) => {
      await page.route('**/api/proba', answer);
      await page.goto('/contact/');
      await fillGood(page);
      await send(page);
      const sum = page.getByRole('alert');
      await expect(sum).toBeFocused();
      await expect(sum).toContainText('Cererea nu a putut fi trimisă de pe site.');
      await expect(sum.getByRole('link', { name: 'Trimiteți-o pe e-mail' })).toHaveAttribute('href', new RegExp(`^mailto:${EMAIL.replace(/\./g, '\\.')}\\?subject=`));
      await expect(page.getByRole('status')).toBeHidden();
      await expect(page.locator('form.trial')).toBeVisible();
    });
  }
});

test.describe('the sent state', () => {
  test('a request the club received shows who will be called', async ({ page }) => {
    await page.route('**/api/proba', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await page.goto('/contact/');
    await fillGood(page);
    await send(page);
    const status = page.getByRole('status');
    await expect(status.getByRole('heading', { name: 'Cererea a ajuns la club' })).toBeFocused();
    await expect(status).toContainText('Mulțumim, Ana Ionescu. Clubul vă contactează la 0745 123 456 ca să stabiliți ziua probei.');
    await expect(status.locator('.tbc')).toContainText('De confirmat de club: în câte zile răspundeți');
    await expect(status.getByRole('link', { name: 'ce e bine să știți înainte de primul antrenament' })).toHaveAttribute('href', '/pentru-parinti/');
    await expect(page.locator('form.trial')).toBeHidden();

    await status.getByRole('button', { name: 'Trimite altă cerere' }).click();
    await expect(page.getByLabel('Numele părintelui')).toBeFocused();
    await expect(page.getByLabel('Numele părintelui')).toHaveValue('');
    await expect(page.getByRole('status')).toBeHidden();
  });

  test('without the endpoint the request opens as an e-mail, and the page says so', async ({ page }) => {
    await catchMailto(page);
    let body: unknown;
    await page.route('**/api/proba', r => {
      body = r.request().postDataJSON();
      return r.fulfill({ status: 404 });
    });
    await page.goto('/contact/');
    await fillGood(page);
    await page.getByLabel(/Mesaj/).fill('Joi după-amiaza.');
    await send(page);
    const status = page.getByRole('status');
    await expect(status.getByRole('heading', { name: 'Am deschis un e-mail către club' })).toBeFocused();
    await expect(status).toContainText('Ajunge la club după ce apăsați „Trimite” în aplicația de e-mail');
    await expect(status).not.toContainText('a ajuns la club');
    expect(body).toMatchObject({ nume: 'Ana Ionescu', telefon: '+40 745-123-456', varsta: '8', mesaj: 'Joi după-amiaza.', acord: 'on', site_web: '' });

    const expected =
      `mailto:${EMAIL}?subject=` +
      encodeURIComponent('Cerere antrenament de probă') +
      '&body=' +
      encodeURIComponent('Numele părintelui: Ana Ionescu\nTelefon: 0745 123 456\nVârsta copilului: 8 ani\nMesaj: Joi după-amiaza.');
    await expect.poll(() => lastMailto(page)).toBe(expected);
    await expect(status.getByRole('link', { name: 'Trimiteți-o pe e-mail' })).toHaveAttribute('href', expected);
  });
});

test('the form can be filled and sent with the keyboard alone', async ({ page }) => {
  await page.route('**/api/proba', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.goto('/contact/');
  const active = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  for (let i = 0; i < 30 && (await active()) !== 'f-nume'; i++) await page.keyboard.press('Tab');
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
  await expect(page.getByRole('heading', { name: 'Cererea a ajuns la club' })).toBeFocused();
});

test('every field has a visible label above it, the right input type and a large target', async ({ page }) => {
  await page.goto('/contact/');
  for (const [label, attrs] of [
    ['Numele părintelui', { type: 'text', autocomplete: 'name', required: '' }],
    ['Telefon', { type: 'tel', autocomplete: 'tel', required: '', 'aria-describedby': 'f-tel-h' }],
    ['Vârsta copilului', { type: 'text', inputmode: 'numeric', maxlength: '2', required: '', 'aria-describedby': 'f-varsta-h' }],
  ] as const) {
    const input = page.getByLabel(label, { exact: true });
    for (const [k, v] of Object.entries(attrs)) await expect(input).toHaveAttribute(k, v);
    await expect(input).not.toHaveAttribute('placeholder');
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  await expect(page.locator('#f-varsta-h')).toContainText('între 3 și 18');
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
  for (const id of ['f-nume', 'f-tel', 'f-varsta', 'f-acord']) await expect(page.locator(`#${id}`)).toHaveAttribute('required', '');
  const form = page.locator('form.trial');
  await expect(form).toHaveAttribute('action', `mailto:${EMAIL}?subject=${encodeURIComponent('Cerere antrenament de probă')}`);
  await expect(form).toHaveAttribute('method', 'post');
  await expect(form).toHaveAttribute('enctype', 'text/plain');
  await expect(form).not.toHaveAttribute('novalidate');
  const line = page.locator('.noscript');
  await expect(line).toBeVisible();
  await expect(line).toContainText('Fără JavaScript');
  await expect(line.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
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
    await page.goto('/contact/');
    const place = page.getByRole('complementary', { name: 'Sala Siderurgistul' });
    await expect(place.getByRole('link', { name: '0700 000 000' })).toHaveAttribute('href', 'tel:0700000000');
    await expect(place.locator('#drum dd')).toHaveText('Text de test pentru drum.');
    await expect(place.locator('.tbc')).toHaveCount(0);

    await page.route('**/api/proba', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await fillGood(page);
    await send(page);
    await expect(page.getByRole('status')).toContainText('Vă sunăm în cel mult 3 zile.');
    await expect(page.getByRole('status').locator('.tbc')).toHaveCount(0);
  });
});

test.describe('at 380px', () => {
  test.use({ viewport: { width: 380, height: 800 } });
  test('nothing overflows: the page, the error state and the sent state', async ({ page }) => {
    await catchMailto(page);
    await page.route('**/api/proba', r => r.fulfill({ status: 404 }));
    await page.goto('/contact/');
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await fits()).toBe(true);
    const button = await page.getByRole('button', { name: 'Trimite cererea' }).boundingBox();
    expect(button!.width).toBeGreaterThan(300); // full width on a phone
    await send(page);
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await fits()).toBe(true);
    await fillGood(page);
    await send(page);
    await expect(page.getByRole('status')).toBeVisible();
    expect(await fits()).toBe(true);
  });
});
