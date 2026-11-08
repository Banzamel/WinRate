import { expect, test } from 'vitest';
import { GAMES } from '../../../src/core/games';
import { chiSquare, gammaQ, neighbourStats, numberStats, pairStats, repeatedDraws, repeatStats } from '../../../src/core/stats';
import { fakeDraws, fakeHistory } from '../../helpers/fakeHistory';

test('chi-square p-values', () => {
  expect(chiSquare([10, 10, 10, 10], [10, 10, 10, 10]).p).toBe(1);
  expect(chiSquare([20, 0, 10, 10], [10, 10, 10, 10]).p).toBeLessThan(0.001);
  expect(Math.abs(gammaQ(1, 2) - Math.exp(-2))).toBeLessThan(1e-9);
});

test('number and pair statistics of a fair history', () => {
  const fair = numberStats(49, 6, fakeHistory(GAMES.lotto, 2000, 3).map((d) => d.pools[0]));
  expect(fair.fit.p).toBeGreaterThan(0.001);
  expect(Math.abs(fair.expected - (2000 * 6) / 49)).toBeLessThan(1e-9);
  const pairs = pairStats(49, 6, fakeHistory(GAMES.lotto, 500, 4).map((d) => d.pools[0]));
  expect(Math.abs(pairs.expected - (500 * 30) / (49 * 48))).toBeLessThan(1e-9);
});

test('pair test of a fair history is not flagged (small expected counts)', () => {
  const draws = fakeHistory(GAMES.eurojackpot, 480, 2).map((d) => d.pools[0]);
  expect(pairStats(50, 5, draws).fit.p).toBeGreaterThan(0.001);
});

test('neighbour expectations add up to all neighbour pairs', () => {
  const n = neighbourStats(49, 6, fakeDraws(500, 3));
  expect(Math.abs(n.gapsExpected.reduce((s, x) => s + x, 0) - 500 * 5)).toBeLessThan(1e-6);
  expect(n.gaps.reduce((s, x) => s + x, 0)).toBe(500 * 5);
  expect(n.fit.p).toBeGreaterThan(0.001);
});

test('repeats from the previous draw', () => {
  const r = repeatStats(49, 6, fakeDraws(800, 5));
  expect(r.observed.reduce((s, x) => s + x, 0)).toBe(799);
  expect(r.fit.p).toBeGreaterThan(0.001);
  expect(repeatedDraws([[1, 2], [3, 4], [1, 2]])).toEqual([{ numbers: [1, 2], at: [0, 2] }]);
});
