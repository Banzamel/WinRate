import { expect, test } from 'vitest';
import { combinationCount, GAMES, tierOdds } from '../../../src/core/games';
import { createScorer, expectedValue, jackpotShare } from '../../../src/core/popularity';

test('popularity: patterns are popular, scattered high numbers are not', () => {
  const score = createScorer(GAMES.lotto.pools[0], 7, []);
  expect(score([1, 2, 3, 4, 5, 6])).toBeGreaterThan(500);
  expect(score([5, 14, 33, 38, 42, 47])).toBeLessThan(1);
  expect(score([3, 7, 12, 19, 25, 31])).toBeGreaterThan(1);
});

test('expected value', () => {
  expect(jackpotShare(1, 0, 100)).toBe(1);
  expect(Math.abs(jackpotShare(1, 100, 100) - (1 - Math.exp(-1)))).toBeLessThan(1e-12);
  const g = { ...GAMES.lotto, tiers: tierOdds(GAMES.lotto), combinations: combinationCount(GAMES.lotto) };
  const avg = expectedValue(g, { jackpot: 15e6, sold: 8e6, prizes: GAMES.lotto.typicalPrizes });
  const rare = expectedValue(g, { jackpot: 15e6, sold: 8e6, prizes: GAMES.lotto.typicalPrizes, popularity: 0.3 });
  expect(avg.returnRate).toBeGreaterThan(0.3);
  expect(avg.returnRate).toBeLessThan(0.7);
  expect(rare.total).toBeGreaterThan(avg.total);
  expect(avg.breakEven).toBeGreaterThan(15e6);
});
