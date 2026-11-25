import { describe, expect, test } from 'vitest';
import { introOnTime, LOAD_INTRO_BUDGET_MS } from '../../src/lib/motion-budget';

describe('introOnTime', () => {
  test('the budget is one second', () => {
    expect(LOAD_INTRO_BUDGET_MS).toBe(1000);
  });

  test('motion code that arrives within the budget plays the intro', () => {
    expect(introOnTime(100, 100)).toBe(true);
    expect(introOnTime(100, 450)).toBe(true);
    expect(introOnTime(100, 1100)).toBe(true);
  });

  test('motion code that arrives later leaves the page as rendered', () => {
    expect(introOnTime(100, 1101)).toBe(false);
    expect(introOnTime(0, 1500)).toBe(false);
  });

  test('a custom budget', () => {
    expect(introOnTime(0, 300, 250)).toBe(false);
    expect(introOnTime(0, 250, 250)).toBe(true);
  });
});
