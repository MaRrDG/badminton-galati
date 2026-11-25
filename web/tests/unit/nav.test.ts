import { describe, expect, test } from 'vitest';
import { isCurrent } from '../../src/lib/nav';

describe('isCurrent', () => {
  test('the homepage is current only on itself', () => {
    expect(isCurrent('/', '/')).toBe(true);
    expect(isCurrent('/', '/sportivi/')).toBe(false);
  });

  test('a section is current on its own page and on the pages under it', () => {
    expect(isCurrent('/sportivi/', '/sportivi/')).toBe(true);
    expect(isCurrent('/sportivi/', '/sportivi/nistor-cristian-ionut/')).toBe(true);
    expect(isCurrent('/noutati/', '/noutati/novi-sad-2026/')).toBe(true);
  });

  test('a section is not current on an address that only starts with the same letters', () => {
    expect(isCurrent('/noutati/', '/noutati-vechi/')).toBe(false);
    expect(isCurrent('/noutati', '/noutati-vechi/')).toBe(false);
    expect(isCurrent('/program/', '/calendar/')).toBe(false);
  });
});
