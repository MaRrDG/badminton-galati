import { describe, expect, test } from 'vitest';
import { initialsOf, toneAt } from '../../src/lib/tiles';

describe('initialsOf', () => {
  test('the first letters of the first two words, uppercase', () => {
    expect(['Nistor Cristian-Ionuț', 'Pazargic Ligia-Beatrice', 'Bordeianu Nectarie-Ioan', 'Dorel Badiu'].map(initialsOf))
      .toEqual(['NC', 'PL', 'BN', 'DB']);
  });

  test('extra spaces and a single word', () => {
    expect(initialsOf('  ștefan   țurcanu  ')).toBe('ȘȚ');
    expect(initialsOf('Ana')).toBe('A');
  });
});

describe('toneAt', () => {
  test('cycles blue, deep, red', () => {
    expect([0, 1, 2, 3].map(toneAt)).toEqual(['blue', 'deep', 'red', 'blue']);
  });
});
