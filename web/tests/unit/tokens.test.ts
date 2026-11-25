import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DIM_OPACITY } from '../../src/lib/filter';

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

describe('items a filter dims stay readable (at least 3:1)', () => {
  type Rgb = [number, number, number];
  const rgb = (hex: string): Rgb => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
  const hex = (c: Rgb) => `#${c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const toSrgb = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
  const weights = [0.2126, 0.7152, 0.0722];
  // grayscale(1) as browsers apply it (on the sRGB values; Chrome renders #d63340 as #575757), as the
  // spec writes it (on linear values), and no filter at all.
  const grayscales: Record<string, (c: Rgb) => Rgb> = {
    'no filter': c => c,
    'sRGB grayscale': c => { const g = weights.reduce((s, w, i) => s + w * c[i], 0); return [g, g, g]; },
    'linear grayscale': c => { const g = toSrgb(weights.reduce((s, w, i) => s + w * toLinear(c[i]), 0)); return [g, g, g]; },
  };
  /** The element's colour after `opacity` over the backdrop (browsers blend sRGB values). */
  const fade = (c: Rgb, backdrop: Rgb): Rgb => c.map((v, i) => DIM_OPACITY * v + (1 - DIM_OPACITY) * backdrop[i]) as Rgb;

  // [text, the field it sits on inside the dimmed item, the backdrop behind the item]
  const surfaces = [
    ['ink', 'white', 'white'], ['red-ink', 'white', 'white'], // news photo items, calendar list
    ['ink-muted', 'white', 'white'], ['blue', 'white', 'white'], // calendar list: played, next
    ['ink', 'mist', 'mist'], ['red-ink', 'mist', 'mist'], ['ink-muted', 'mist', 'mist'], // news older band, a targeted list row
    ['ink', 'mist', 'white'], ['red-ink', 'mist', 'white'], // news mist tile
    ['white', 'red-field', 'white'], ['white', 'blue', 'white'], // news red and blue tiles
    ['white', 'red-field', 'mist'], // calendar list "acasă" on a targeted row
    ['blue-deep', 'blue-tint', 'mist-soft'], ['red-deep', 'red-tint', 'mist-soft'], // calendar: played
    ['white', 'blue', 'mist-soft'], ['white', 'red-field', 'mist-soft'], // calendar: coming
    ['white', 'blue-deep', 'mist-soft'], ['white', 'red-ink', 'mist-soft'], ['white', 'ink', 'mist-soft'], // calendar: chosen, today
  ] as const;

  for (const [model, gray] of Object.entries(grayscales)) {
    for (const [text, field, backdrop] of surfaces) {
      test(`--${text} on --${field} over --${backdrop}, ${model}`, () => {
        const b = rgb(token(backdrop));
        const ratio = contrast(hex(fade(gray(rgb(token(text))), b)), hex(fade(gray(rgb(token(field))), b)));
        expect(ratio).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
