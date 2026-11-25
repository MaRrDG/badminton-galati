import { describe, expect, test } from 'vitest';
import {
  daysBetween, daysInMonth, formatDateRo, formatRangeRo, formatShortRangeRo, isIsoDate, monthNameRo, splitRangeRo, todayInBucharest, weekdayOf,
} from '../../src/lib/dates';

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

describe('date validation', () => {
  test('rejects a month outside 1–12', () => {
    expect(() => formatDateRo('2026-13-01')).toThrow(/month/);
    expect(() => formatDateRo('2026-00-10')).toThrow(/month/);
  });

  test('rejects a day outside 1–31', () => {
    expect(() => formatDateRo('2026-05-32')).toThrow(/day/);
    expect(() => daysBetween('2026-05-00', '2026-05-01')).toThrow(/day/);
  });
});

describe('todayInBucharest', () => {
  test('after 22:00 UTC in winter it is already the next day in Bucharest (UTC+2)', () => {
    expect(todayInBucharest(new Date('2026-11-24T22:30:00Z'))).toBe('2026-11-25');
    expect(todayInBucharest(new Date('2026-11-24T21:59:00Z'))).toBe('2026-11-24');
  });

  test('after 21:00 UTC in summer it is already the next day in Bucharest (UTC+3)', () => {
    expect(todayInBucharest(new Date('2026-06-30T21:30:00Z'))).toBe('2026-07-01');
    expect(todayInBucharest(new Date('2026-06-30T20:59:00Z'))).toBe('2026-06-30');
  });

  test('reads the current instant by default', () => {
    expect(todayInBucharest()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatRangeRo without the year', () => {
  test('drops the year when both ends share it', () => {
    expect(formatRangeRo('2026-11-20', '2026-11-22', { year: false })).toBe('20–22 noiembrie');
    expect(formatRangeRo('2026-10-30', '2026-11-01', { year: false })).toBe('30 octombrie – 1 noiembrie');
    expect(formatRangeRo('2026-06-30', '2026-06-30', { year: false })).toBe('30 iunie');
  });

  test('keeps both years when the range crosses a year', () => {
    expect(formatRangeRo('2026-12-30', '2027-01-02', { year: false })).toBe('30 decembrie 2026 – 2 ianuarie 2027');
  });
});

describe('splitRangeRo', () => {
  test('splits the days from the month and year', () => {
    expect(splitRangeRo('2026-11-27', '2026-11-29')).toEqual({ days: '27–29', rest: 'noiembrie 2026' });
    expect(splitRangeRo('2026-06-30', '2026-06-30')).toEqual({ days: '30', rest: 'iunie 2026' });
  });

  test('names both months, then both years, when the range crosses them', () => {
    expect(splitRangeRo('2026-10-30', '2026-11-01')).toEqual({ days: '30–1', rest: 'octombrie – noiembrie 2026' });
    expect(splitRangeRo('2026-12-30', '2027-01-02')).toEqual({ days: '30–2', rest: 'decembrie 2026 – ianuarie 2027' });
  });
});

describe('isIsoDate', () => {
  test('accepts a calendar date and rejects anything else', () => {
    expect(isIsoDate('2026-11-25')).toBe(true);
    expect(isIsoDate('2026-11-5')).toBe(false);
    expect(isIsoDate('2026-13-05')).toBe(false);
    expect(isIsoDate('25.11.2026')).toBe(false);
  });
});

describe('formatShortRangeRo', () => {
  test('abbreviates the month, with a dot only where letters are left out', () => {
    expect(formatShortRangeRo('2026-03-13', '2026-03-15')).toBe('13–15 mar.');
    expect(formatShortRangeRo('2026-09-04', '2026-09-06')).toBe('4–6 sept.');
    expect(formatShortRangeRo('2026-05-08', '2026-05-10')).toBe('8–10 mai');
    expect(formatShortRangeRo('2026-06-30', '2026-06-30')).toBe('30 iun.');
  });

  test('names both months when the range crosses one, and leaves out the year', () => {
    expect(formatShortRangeRo('2026-10-30', '2026-11-01')).toBe('30 oct. – 1 nov.');
    expect(formatShortRangeRo('2026-12-30', '2027-01-02')).toBe('30 dec. – 2 ian.');
  });

  test('has an abbreviation for every month', () => {
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    expect(months.map(m => formatShortRangeRo(`2026-${m}-01`, `2026-${m}-01`).slice(2))).toEqual(
      ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'],
    );
  });
});

describe('weekdayOf', () => {
  test('ISO weekday, Monday 1 to Sunday 7', () => {
    expect(weekdayOf('2026-01-01')).toBe(4); // Thursday
    expect(weekdayOf('2026-03-01')).toBe(7); // Sunday
    expect(weekdayOf('2026-06-01')).toBe(1); // Monday
    expect(weekdayOf('2026-11-25')).toBe(3); // Wednesday
    expect(weekdayOf('2028-02-29')).toBe(2); // Tuesday, a leap day
  });
});

describe('daysInMonth and monthNameRo', () => {
  test('February has 29 days in leap years only', () => {
    expect([daysInMonth(2026, 2), daysInMonth(2028, 2), daysInMonth(2000, 2), daysInMonth(2100, 2)]).toEqual([28, 29, 29, 28]);
    expect([1, 4, 6, 9, 11, 12].map(m => daysInMonth(2026, m))).toEqual([31, 30, 30, 30, 30, 31]);
  });

  test('lowercase Romanian month names', () => {
    expect([monthNameRo(1), monthNameRo(9), monthNameRo(12)]).toEqual(['ianuarie', 'septembrie', 'decembrie']);
  });
});
