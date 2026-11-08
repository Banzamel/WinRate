import { expect, test } from 'vitest';
import { binom, forEachCombination, matchProbability, rank, unrank } from '../../../src/core/combinatorics';

test('binomial coefficients of the games', () => {
  expect(binom(49, 6)).toBe(13983816);
  expect(binom(50, 5)).toBe(2118760);
  expect(binom(12, 2)).toBe(66);
  expect(binom(120, 3)).toBe(280840); // beyond the table
  expect(binom(5, 7)).toBe(0);
});

test('rank and unrank are inverse and follow enumeration order', () => {
  let i = 0;
  forEachCombination(12, 4, (a) => {
    expect(rank(a)).toBe(i);
    expect(unrank(i, 4)).toEqual(a);
    i++;
  });
  expect(i).toBe(binom(12, 4));
  expect(unrank(binom(49, 6) - 1, 6)).toEqual([44, 45, 46, 47, 48, 49]);
});

test('enumeration stops when the callback returns false', () => {
  let n = 0;
  forEachCombination(10, 3, () => ++n < 5 || false);
  expect(n).toBe(5);
});

test('match probabilities of a pool sum to 1', () => {
  const sum = [0, 1, 2, 3, 4, 5, 6].reduce((s, h) => s + matchProbability(49, 6, h), 0);
  expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
});
