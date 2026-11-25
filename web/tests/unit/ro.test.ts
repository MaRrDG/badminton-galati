import { describe, expect, test } from 'vitest';
import { countRo, feminineCountRo } from '../../src/lib/ro';

describe('countRo', () => {
  test('one is singular, then plural; "de" from 20 on and after 00', () => {
    expect(countRo(1, 'sportiv', 'sportivi')).toBe('1 sportiv');
    expect(countRo(3, 'sportiv', 'sportivi')).toBe('3 sportivi');
    expect(countRo(19, 'sportiv', 'sportivi')).toBe('19 sportivi');
    expect(countRo(20, 'sportiv', 'sportivi')).toBe('20 de sportivi');
    expect(countRo(101, 'sportiv', 'sportivi')).toBe('101 sportivi');
    expect(countRo(200, 'sportiv', 'sportivi')).toBe('200 de sportivi');
  });
});

describe('feminineCountRo', () => {
  test('a feminine word up to ten, digits above', () => {
    expect(feminineCountRo(1, 'fotografie', 'fotografii')).toBe('o fotografie');
    expect(feminineCountRo(1, 'competiție', 'competiții')).toBe('o competiție');
    expect(feminineCountRo(2, 'competiție', 'competiții')).toBe('două competiții');
    expect(feminineCountRo(5, 'competiție', 'competiții')).toBe('cinci competiții');
    expect(feminineCountRo(10, 'competiție', 'competiții')).toBe('zece competiții');
    expect(feminineCountRo(11, 'competiție', 'competiții')).toBe('11 competiții');
    expect(feminineCountRo(20, 'competiție', 'competiții')).toBe('20 de competiții');
  });
});
