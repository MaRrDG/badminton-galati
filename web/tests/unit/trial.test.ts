import { describe, expect, test } from 'vitest';
import { AGE_MAX, AGE_MIN, MAILTO_MAX, errorIntro, formatPhoneRo, isSpam, normalizePhoneRo, trialDelivered, trialMailto, validateTrial } from '../../src/lib/trial';

const good = { cine: 'copil', nume: 'Ana Ionescu', telefon: '0745 123 456', varsta: '8', mesaj: '', acord: 'on' };
const fields = (input: Parameters<typeof validateTrial>[0]) => {
  const r = validateTrial(input);
  return r.ok ? [] : r.errors.map(e => e.field);
};
const summaries = (input: Parameters<typeof validateTrial>[0]) => {
  const r = validateTrial(input);
  return r.ok ? [] : r.errors.map(e => e.summary);
};

describe('validateTrial', () => {
  test('a complete request comes back clean, the phone as 10 digits', () => {
    expect(validateTrial(good)).toEqual({ ok: true, value: { who: 'copil', name: 'Ana Ionescu', phone: '0745123456', age: 8 } });
    expect(validateTrial({ ...good, nume: '  Ana Ionescu ', mesaj: '  Marțea ne convine.  ', acord: true })).toEqual({
      ok: true,
      value: { who: 'copil', name: 'Ana Ionescu', phone: '0745123456', age: 8, message: 'Marțea ne convine.' },
    });
  });

  test('Romanian phone formats are accepted', () => {
    for (const telefon of ['+40 745-123-456', '0040 745 123 456', '0745.123.456', '(0745) 123 456', '0745123456', '+40745123456', '0236 123 456', '+40 (0)745 123 456', '0040 (0) 745-123-456']) {
      expect(validateTrial({ ...good, telefon })).toMatchObject({ ok: true });
    }
    expect(validateTrial({ ...good, telefon: '+40 745-123-456' })).toMatchObject({ ok: true, value: { phone: '0745123456' } });
  });

  test('a short phone and a missing consent are reported in field order', () => {
    expect(summaries({ ...good, telefon: '0745 12', acord: undefined })).toEqual(['Telefonul are prea puține cifre', 'Lipsește acordul pentru date']);
    const r = validateTrial({ ...good, telefon: '0745 12' });
    expect(r.ok === false && r.errors[0]).toEqual({
      field: 'telefon',
      summary: 'Telefonul are prea puține cifre',
      message: 'Numărul are prea puține cifre. Scrieți-l cu 10 cifre, de exemplu 0745 123 456.',
    });
  });

  test('an empty form lists every required field', () => {
    expect(fields({ cine: 'copil' })).toEqual(['nume', 'telefon', 'varsta', 'acord']);
    expect(summaries({ cine: 'copil' })).toEqual(['Lipsește numele părintelui', 'Lipsește telefonul', 'Lipsește vârsta copilului', 'Lipsește acordul pentru date']);
    expect(fields({ cine: 'copil', nume: '   ', telefon: ' ', varsta: ' ', acord: 'off' })).toEqual(['nume', 'telefon', 'varsta', 'acord']);
    // Without the first answer the age is still asked for, as on the child path.
    expect(fields({})).toEqual(['cine', 'nume', 'telefon', 'varsta', 'acord']);
    expect(summaries({ ...good, cine: 'altcineva' })).toEqual(['Lipsește cine vine la antrenament']);
  });

  test('an adult asking for themself gives no age', () => {
    const self = { cine: 'eu', nume: 'Dan Popa', telefon: '0745 123 456', acord: 'on' };
    expect(validateTrial(self)).toEqual({ ok: true, value: { who: 'eu', name: 'Dan Popa', phone: '0745123456' } });
    expect(validateTrial({ ...self, varsta: '45' })).toEqual({ ok: true, value: { who: 'eu', name: 'Dan Popa', phone: '0745123456' } });
    expect(summaries({ cine: 'eu' })).toEqual(['Lipsește numele', 'Lipsește telefonul', 'Lipsește acordul pentru date']);
  });

  test('a phone that is not a Romanian number is wrong, not short', () => {
    for (const telefon of ['0745 123 4567', '745 123 456 0', 'telefon', '0745 12a 456', '+44 7700 900123']) {
      expect(summaries({ ...good, telefon })).toEqual(['Telefonul nu pare corect']);
    }
  });

  test(`the age is a whole number of years between ${AGE_MIN} and ${AGE_MAX}`, () => {
    for (const v of ['0', '100', '7.5', 'opt', '-8', '2', '19', '8 ani']) expect(fields({ ...good, varsta: v })).toEqual(['varsta']);
    for (const v of ['3', ' 8 ', '18', 12]) expect(validateTrial({ ...good, varsta: v }).ok).toBe(true);
    expect(summaries({ ...good, varsta: 'opt' })).toEqual(['Vârsta nu pare corectă']);
  });

  test('the name has 2 to 100 characters and the message at most 1000', () => {
    expect(fields({ ...good, nume: 'A' })).toEqual(['nume']);
    expect(fields({ ...good, nume: 'A'.repeat(101) })).toEqual(['nume']);
    expect(validateTrial({ ...good, nume: 'A'.repeat(100) }).ok).toBe(true);
    expect(validateTrial({ ...good, mesaj: 'x'.repeat(1000) }).ok).toBe(true);
    expect(summaries({ ...good, mesaj: 'x'.repeat(1001) })).toEqual(['Mesajul e prea lung']);
  });

  test('only a real yes counts as consent', () => {
    for (const acord of [true, 'on', 'true']) expect(validateTrial({ ...good, acord }).ok).toBe(true);
    for (const acord of [false, 'false', '', 'off', 1, undefined]) expect(fields({ ...good, acord })).toEqual(['acord']);
  });

  test('values that are not text are treated as missing', () => {
    expect(fields({ cine: 'copil', nume: 42, telefon: {}, varsta: null, acord: 'on' })).toEqual(['nume', 'telefon', 'varsta']);
  });
});

test('isSpam: the hidden field is filled only by robots', () => {
  expect(isSpam({ ...good, site_web: 'http://spam' })).toBe(true);
  expect(isSpam(good)).toBe(false);
  expect(isSpam({ ...good, site_web: '' })).toBe(false);
  expect(isSpam({ ...good, site_web: '   ' })).toBe(false);
});

test('phones are normalised and written the Romanian way', () => {
  expect(normalizePhoneRo('+40 745-123-456')).toBe('0745123456');
  expect(normalizePhoneRo('0700 000 000')).toBe('0700000000');
  expect(normalizePhoneRo('+40 (0)745 123 456')).toBe('0745123456');
  expect(formatPhoneRo('0745123456')).toBe('0745 123 456');
  expect(formatPhoneRo('0700 000 000')).toBe('0700 000 000');
  expect(formatPhoneRo('112')).toBe('112');
});

test('errorIntro counts the things to check in words', () => {
  expect(errorIntro(1)).toBe('Verificați un lucru:');
  expect(errorIntro(2)).toBe('Verificați două lucruri:');
  expect(errorIntro(3)).toBe('Verificați trei lucruri:');
  expect(errorIntro(4)).toBe('Verificați patru lucruri:');
  expect(errorIntro(5)).toBe('Verificați cinci lucruri:');
});

test('trialDelivered: only a 2xx answer with { ok: true } means the club has the request', () => {
  expect(trialDelivered(200, { ok: true })).toBe(true);
  expect(trialDelivered(201, { ok: true })).toBe(true);
  expect(trialDelivered(200, { ok: false })).toBe(false);
  expect(trialDelivered(200, {})).toBe(false);
  expect(trialDelivered(200, undefined)).toBe(false);
  expect(trialDelivered(200, 'ok')).toBe(false);
  expect(trialDelivered(500, { ok: true })).toBe(false);
});

describe('trialMailto', () => {
  test('a pre-filled e-mail to the club', () => {
    expect(trialMailto({ who: 'copil', name: 'Ana', phone: '0745123456', age: 8 }, 'siderurgistul@badmintongalati.ro')).toBe(
      'mailto:siderurgistul@badmintongalati.ro?subject=' +
        encodeURIComponent('Cerere antrenament de probă') +
        '&body=' +
        encodeURIComponent('Numele părintelui: Ana') + '%0D%0A' + encodeURIComponent('Telefon: 0745 123 456') + '%0D%0A' +
        encodeURIComponent('Vârsta copilului: 8 ani'),
    );
    const self = trialMailto({ who: 'eu', name: 'Dan', phone: '0745123456' }, 'club@example.ro');
    expect(decodeURIComponent(self.split('&body=')[1]!)).toBe('Vine la antrenament: chiar eu\r\nNume: Dan\r\nTelefon: 0745 123 456');
  });

  test('the message is added when there is one, and nothing breaks out of the body', () => {
    const url = trialMailto({ who: 'copil', name: 'Ana & Dan', phone: '0745123456', age: 8, message: 'Joi?\nSau vineri' }, 'club@example.ro');
    const body = decodeURIComponent(url.split('&body=')[1]!);
    expect(body).toBe('Numele părintelui: Ana & Dan\r\nTelefon: 0745 123 456\r\nVârsta copilului: 8 ani\r\nMesaj: Joi?\nSau vineri');
    expect(url.split('&')).toHaveLength(2);
  });

  test('a long message is cut at a word so the address stays short enough for mail apps', () => {
    const long = 'Fetița ține să încerce, își dorește mult, și-a cumpărat rachetă și învață repede. '.repeat(13).slice(0, 1000);
    const url = trialMailto({ who: 'copil', name: 'Ana Ionescu', phone: '0745123456', age: 8, message: long }, 'siderurgistul@badmintongalati.ro');
    expect(url.length).toBeLessThanOrEqual(MAILTO_MAX);
    const message = decodeURIComponent(url.split('&body=')[1]!).split('\r\nMesaj: ')[1]!;
    expect(message.endsWith('…')).toBe(true);
    expect(message.length).toBeLessThanOrEqual(600);
    expect(long.startsWith(message.slice(0, -1))).toBe(true);
    expect(message.slice(0, -1)).toMatch(/\S$/);
    expect(long[message.length - 1]).toMatch(/[\s,.]/); // the cut falls between words
    // A short message is never cut.
    expect(decodeURIComponent(trialMailto({ who: 'eu', name: 'Dan', phone: '0745123456', message: 'Marțea.' }, 'a@b.ro'))).toContain('Mesaj: Marțea.');
  });
});
