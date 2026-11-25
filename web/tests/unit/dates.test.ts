import { describe, expect, test } from 'vitest';
import { formatDateRo, formatRangeRo } from '../../src/lib/dates';

describe('formatDateRo', () => {
  test('writes day, lowercase Romanian month and year', () => {
    expect(formatDateRo('2026-06-30')).toBe('30 iunie 2026');
  });

  test('drops the leading zero of the day', () => {
    expect(formatDateRo('2026-01-05')).toBe('5 ianuarie 2026');
    expect(formatDateRo('2026-12-31')).toBe('31 decembrie 2026');
  });
});

describe('formatRangeRo', () => {
  test('a range inside one month names the month once', () => {
    expect(formatRangeRo('2026-11-27', '2026-11-29')).toBe('27–29 noiembrie 2026');
  });

  test('a range across months names both months and the year once', () => {
    expect(formatRangeRo('2026-10-30', '2026-11-01')).toBe('30 octombrie – 1 noiembrie 2026');
  });

  test('a range across years writes both full dates', () => {
    expect(formatRangeRo('2026-12-30', '2027-01-02')).toBe('30 decembrie 2026 – 2 ianuarie 2027');
  });

  test('a single-day event reads like a plain date', () => {
    expect(formatRangeRo('2026-06-30', '2026-06-30')).toBe(formatDateRo('2026-06-30'));
  });
});
