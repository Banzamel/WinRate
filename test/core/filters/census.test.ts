import { expect, test } from 'vitest';
import { binom, forEachCombination } from '../../../src/core/combinatorics';
import { GAMES } from '../../../src/core/games';
import { census, createChecker, defaultFilters, distributions, type FilterConfig } from '../../../src/core/filters';

// A small 6-of-20 pool keeps the exhaustive checks fast.
const SMALL = { size: 20, pick: 6 };
const allOff = (): FilterConfig => Object.fromEntries(Object.keys(defaultFilters(SMALL)).map((k) => [k, null]));

test('census counts exactly what the checker removes', () => {
  const config = { ...allOff(), odd: [1, 5] as [number, number], maxRun: 2 };
  const res = census(SMALL, 5, config, null);
  const check = createChecker(SMALL, 5, config, null);
  let kept = 0;
  forEachCombination(20, 6, (a) => { if (!check(a)) kept++; });
  expect(res.allowedCount).toBe(kept);
  expect(res.total).toBe(binom(20, 6));
  // all-odd + all-even 6-of-20: 2 * C(10,6)
  expect(res.filters.find((f) => f.id === 'odd')?.removed).toBe(2 * binom(10, 6));
});

test('expected distributions add up to all combinations', () => {
  const d = distributions(SMALL, 5);
  for (const m of Object.values(d.metrics)) expect(m.counts.reduce((s, c) => s + c, 0)).toBe(d.total);
});

test('the default filters remove about a fifth of Lotto', { timeout: 60000 }, () => {
  const res = census(GAMES.lotto.pools[0], GAMES.lotto.slipColumns, defaultFilters(GAMES.lotto.pools[0]), null);
  const removed = 1 - res.allowedCount / res.total;
  expect(removed).toBeGreaterThan(0.17);
  expect(removed).toBeLessThan(0.23);
});
