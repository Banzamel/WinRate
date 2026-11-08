import { expect, test } from 'vitest';
import { binom } from '../../../src/core/combinatorics';
import { GAMES } from '../../../src/core/games';
import { census, createChecker, defaultFilters, failedIds, historySurvival, HistoryContext, type FilterConfig } from '../../../src/core/filters';
import { fakeHistory, smallGame } from '../../helpers/fakeHistory';

const SMALL = { size: 20, pick: 6 };
const allOff = (): FilterConfig => Object.fromEntries(Object.keys(defaultFilters(SMALL)).map((k) => [k, null]));

test('history filter removes past draws and near misses', () => {
  const ctx = new HistoryContext(SMALL, [[1, 4, 7, 10, 13, 16]]);
  const off = allOff();
  expect(createChecker(SMALL, 5, { ...off, history: 6 }, ctx)([1, 4, 7, 10, 13, 16])).toBeTruthy();
  expect(createChecker(SMALL, 5, { ...off, history: 6 }, ctx)([1, 4, 7, 10, 13, 17])).toBe(0);
  expect(createChecker(SMALL, 5, { ...off, history: 5 }, ctx)([1, 4, 7, 10, 13, 17])).toBeTruthy();
  expect(createChecker(SMALL, 5, { ...off, lastOverlap: 2 }, ctx)([1, 2, 3, 4, 5, 7])).toBeTruthy();
});

test('weight filters follow the z-scores of the history', () => {
  const ctx = new HistoryContext(SMALL, [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 7]]);
  const check = createChecker(SMALL, 5, { ...allOff(), numberWeight: -0.5 }, ctx);
  expect(failedIds(check([15, 16, 17, 18, 19, 20]))).toEqual(['numberWeight']);
  expect(check([1, 2, 3, 4, 5, 6])).toBe(0);
});

test('a fair history keeps draws as often as combinations (efficiency ~ 1)', () => {
  const draws = fakeHistory(smallGame(20, 6), 3000, 9);
  const config = { ...allOff(), odd: [2, 4] as [number, number], maxRun: 2 };
  const kept = census(SMALL, 5, config, null).allowedCount / binom(20, 6);
  const s = historySurvival(SMALL, 5, config, draws);
  expect(Math.abs(s.survived / s.draws - kept)).toBeLessThan(0.04);
  expect(GAMES.lotto.slipColumns).toBe(7);
});
