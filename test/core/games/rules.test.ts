import { expect, test } from 'vitest';
import { combinationCount, eraDraws, eraOf, GAMES, getGame, hitsOf, tierFor, tierOdds } from '../../../src/core/games';

test('published odds of Lotto', () => {
  const odds = Object.fromEntries(tierOdds(GAMES.lotto).map((t) => [t.id, Math.round(t.oneIn)]));
  expect(odds).toEqual({ 6: 13983816, 5: 54201, 4: 1032, 3: 57 });
});

test('published odds of Eurojackpot', () => {
  expect(combinationCount(GAMES.eurojackpot)).toBe(139838160);
  const odds = Object.fromEntries(tierOdds(GAMES.eurojackpot).map((t) => [t.id, Math.round(t.oneIn)]));
  expect(odds['5+1']).toBe(6991908);
  expect(odds['2+1']).toBe(49);
});

test('Eurojackpot rule eras', () => {
  expect(eraOf(GAMES.eurojackpot, '2013-01-01').pools[1].size).toBe(8);
  expect(eraOf(GAMES.eurojackpot, '2020-01-01').pools[1].size).toBe(10);
  expect(eraOf(GAMES.eurojackpot, '2024-01-01').pools[1].size).toBe(12);
  expect(eraDraws(GAMES.eurojackpot, [{ date: '2020-01-01', pools: [] }, { date: '2023-01-01', pools: [] }])).toHaveLength(1);
});

test('tier lookup and hits', () => {
  expect(tierFor(GAMES.eurojackpot, [3, 2])?.id).toBe('3+2');
  expect(tierFor(GAMES.eurojackpot, [1, 1])).toBeNull();
  expect(tierFor(GAMES.lotto, [3])?.fixed).toBe(35);
  expect(hitsOf([[1, 2, 3], [4]], [[2, 3, 9], [4]])).toEqual([2, 1]);
});

test('unknown game', () => {
  expect(() => getGame('keno')).toThrow('Unknown game');
});
