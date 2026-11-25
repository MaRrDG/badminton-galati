import { describe, expect, test } from 'vitest';
import { filterBarCss, filterCss } from '../../src/lib/filter';

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
    expect(css).toMatch(/\[data-f\]:not\(\[data-f~="u9"\]\)\s*\{\s*opacity:0\.8;filter:grayscale\(1\)/);
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

describe('filterBarCss', () => {
  const options = [{ value: 'toti', label: 'Toți' }, { value: 'u17', label: 'U17' }];

  test('the "all" option shows its count first and filters nothing', () => {
    const css = filterBarCss('.roster', 'cat', options, { effect: 'hide', status: true });
    expect(css).toContain('.roster [data-count-for]:not([data-count-for="toti"]){display:none}');
    expect(css).toContain('[value="u17"]:checked');
    expect(css).not.toContain('[value="toti"]:checked');
  });

  test('refuses an unsafe value in any option, the first one too', () => {
    const bad = [{ value: ']</style>', label: 'Toți' }, ...options.slice(1)];
    expect(() => filterBarCss('.roster', 'cat', bad, { effect: 'hide' })).toThrow();
    expect(() => filterBarCss('.roster', 'cat', bad, { effect: 'hide', status: true })).toThrow();
    expect(() => filterBarCss('.roster', 'c"at', options, { effect: 'hide' })).toThrow();
  });
});
