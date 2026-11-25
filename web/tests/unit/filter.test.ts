import { describe, expect, test } from 'vitest';
import { filterCss } from '../../src/lib/filter';

describe('filterCss', () => {
  test('hides the items of other values while one is checked', () => {
    const css = filterCss('.roster', 'cat', ['u17'], { effect: 'hide' });
    expect(css).toContain('.roster:has(input[name="cat"][value="u17"]:checked) [data-f]:not([data-f~="u17"])');
    expect(css).toContain('display:none');
    expect(css).toContain('@supports not selector(:has(*))');
    expect(css).toContain('.roster .filter');
  });

  test('shows the count of the checked value', () => {
    const css = filterCss('.roster', 'cat', ['u17', 'u15'], { effect: 'hide' });
    expect(css).toContain('.roster:has(input[name="cat"][value="u15"]:checked) [data-count-for="u15"]');
  });

  test('dims instead of hiding, so the layout does not reflow', () => {
    const css = filterCss('.cal', 'cat', ['u9'], { effect: 'dim' });
    expect(css).toMatch(/\[data-f\]:not\(\[data-f~="u9"\]\)\s*\{\s*opacity:\.25/);
    expect(css).not.toMatch(/\[data-f~="u9"\]\)\s*\{\s*display:none/);
  });

  test('hides a container with no match', () => {
    const css = filterCss('.week', 'grupa', ['initiere'], { effect: 'hide', container: '.daycol' });
    expect(css).toContain('.week:has(input[name="grupa"][value="initiere"]:checked) .daycol:not(:has([data-f~="initiere"]))');
  });

  test('refuses values that could break out of the selector', () => {
    expect(() => filterCss('.x', 'cat', ['u"17'], { effect: 'hide' })).toThrow();
    expect(() => filterCss('.x', 'cat', ['U17'], { effect: 'hide' })).toThrow();
    expect(() => filterCss('.x', 'c"at', ['u17'], { effect: 'hide' })).toThrow();
  });
});
