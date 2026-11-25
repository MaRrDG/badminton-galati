import { describe, expect, test } from 'vitest';
import { AGE_MAX, AGE_MIN, errorIntro, formatPhoneRo, isSpam, normalizePhoneRo, trialMailto, validateTrial } from '../../src/lib/trial';

const good = { nume: 'Ana Ionescu', telefon: '0745 123 456', varsta: '8', mesaj: '', acord: 'on' };
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
    expect(validateTrial(good)).toEqual({ ok: true, value: { name: 'Ana Ionescu', phone: '0745123456', age: 8 } });
    expect(validateTrial({ ...good, nume: '  Ana Ionescu ', mesaj: '  Marțea ne convine.  ', acord: true })).toEqual({
      ok: true,
      value: { name: 'Ana Ionescu', phone: '0745123456', age: 8, message: 'Marțea ne convine.' },
    });
  });

  test('Romanian phone formats are accepted', () => {
    for (const telefon of ['+40 745-123-456', '0040 745 123 456', '0745.123.456', '(0745) 123 456', '0745123456', '+40745123456', '0236 123 456']) {
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
    expect(fields({})).toEqual(['nume', 'telefon', 'varsta', 'acord']);
    expect(summaries({})).toEqual(['Lipsește numele părintelui', 'Lipsește telefonul', 'Lipsește vârsta copilului', 'Lipsește acordul pentru date']);
    expect(fields({ nume: '   ', telefon: ' ', varsta: ' ', acord: 'off' })).toEqual(['nume', 'telefon', 'varsta', 'acord']);
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
    expect(fields({ nume: 42, telefon: {}, varsta: null, acord: 'on' })).toEqual(['nume', 'telefon', 'varsta']);
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

describe('trialMailto', () => {
  test('a pre-filled e-mail to the club', () => {
    expect(trialMailto({ name: 'Ana', phone: '0745123456', age: 8 }, 'siderurgistul@badmintongalati.ro')).toBe(
      'mailto:siderurgistul@badmintongalati.ro?subject=' +
        encodeURIComponent('Cerere antrenament de probă') +
        '&body=' +
        encodeURIComponent('Numele părintelui: Ana\nTelefon: 0745 123 456\nVârsta copilului: 8 ani'),
    );
  });

  test('the message is added when there is one, and nothing breaks out of the body', () => {
    const url = trialMailto({ name: 'Ana & Dan', phone: '0745123456', age: 8, message: 'Joi?\nSau vineri' }, 'club@example.ro');
    const body = decodeURIComponent(url.split('&body=')[1]!);
    expect(body).toBe('Numele părintelui: Ana & Dan\nTelefon: 0745 123 456\nVârsta copilului: 8 ani\nMesaj: Joi?\nSau vineri');
    expect(url.split('&')).toHaveLength(2);
  });
});
