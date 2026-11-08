import { expect, test } from 'vitest';
import { binom } from '../../../src/core/combinatorics';
import { GAMES, tierOdds } from '../../../src/core/games';
import { systemTable, wheel } from '../../../src/core/bets';

test('wheel guarantees every triple', () => {
  const nums = [1, 5, 9, 12, 17, 23, 28, 31, 36, 40];
  const w = wheel(nums, 6, 3);
  expect(w.tickets.length).toBeLessThan(binom(10, 6));
  for (let a = 0; a < 10; a++) for (let b = a + 1; b < 10; b++) for (let c = b + 1; c < 10; c++) {
    const tri = [nums[a], nums[b], nums[c]];
    expect(w.tickets.some((t) => tri.every((x) => t.includes(x)))).toBe(true);
  }
  expect(() => wheel([1, 2, 3], 6, 3)).toThrow('choose at least 6');
});

test('system bet of 8 numbers', () => {
  const t = systemTable(49, 6, 8, tierOdds(GAMES.lotto));
  expect(t.bets).toBe(28);
  expect(Math.abs(t.rows.reduce((s, r) => s + r.probability, 0) - 1)).toBeLessThan(1e-12);
  // all six drawn among the 8: one six, 12 fives (6·2), 15 fours (15·1)
  expect(t.rows[6].wins).toEqual({ 6: 1, 5: 12, 4: 15 });
  // three drawn among the 8: C(3,3)·C(5,3) = 10 threes
  expect(t.rows[3].wins).toEqual({ 3: 10 });
  expect(Math.abs(t.jackpot - 28 / 13983816)).toBeLessThan(1e-15);
});
