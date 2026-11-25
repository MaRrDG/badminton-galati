import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

/** The colour tokens of tokens.css, by name without the leading dashes. */
const tokens = Object.fromEntries(
  [...readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8').matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)]
    .map(([, name, hex]) => [name, hex]),
);

/** WCAG 2 relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const token = (name: string) => {
  const hex = tokens[name];
  if (!hex) throw new Error(`tokens.css has no colour --${name}`);
  return hex;
};

describe('colour tokens meet WCAG AA for body text', () => {
  for (const [text, field] of [['white', 'red-field'], ['white', 'blue'], ['ink', 'mist'], ['ink', 'white']] as const) {
    test(`--${text} on --${field} is at least 4.5:1`, () => {
      expect(contrast(token(text), token(field))).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Pairs the inner pages add (values from the mockups' color-mix()).
  for (const [text, field] of [
    ['blue-deep', 'blue-tint'], // a played event in the calendar
    ['red-deep', 'red-tint'], // a home event
    ['ink-soft', 'white'], // "de confirmat" text
    ['ink-muted', 'white'], // weekday letters, "fără competiții"
    ['ink', 'mist-soft'], // a calendar day
  ] as const) {
    test(`--${text} on --${field} is at least 4.5:1`, () => {
      expect(contrast(token(text), token(field))).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('the accent red stays the brand red; text sits on the deeper field red', () => {
    expect(token('red').toLowerCase()).toBe('#e23a45');
    expect(contrast(token('white'), token('red'))).toBeLessThan(4.5);
  });
});
