import { expect, test } from 'vitest';
import { defaultFilters, type FilterConfig } from '../../../src/core/filters';
import { GAMES } from '../../../src/core/games';
import { backtest, systemNumbers, untilHit, untilHitSystem } from '../../../src/core/simulate';
import { fakeHistory, smallGame } from '../../helpers/fakeHistory';

const allOff = (pool: { size: number; pick: number }): FilterConfig => Object.fromEntries(Object.keys(defaultFilters(pool)).map((k) => [k, null]));

test('backtest and until-hit', { timeout: 120000 }, () => {
  const game = smallGame(20, 4, { tiers: [{ id: '4', hits: [4] }, { id: '3', hits: [3] }] });
  const draws = fakeHistory(game, 60, 11);
  const off = allOff(game.pools[0]);
  const bt = backtest(game, draws, { strategy: 'filtered', config: { ...off, odd: [1, 3] }, tickets: 5, tests: 20, seed: 3 });
  expect(bt.draws).toBe(20);
  const hit = untilHit(game, draws, { index: -1, strategy: 'random', seed: 7 });
  expect(hit.hit && hit.attempts > 0).toBe(true);
  // A filter that removes the winning ticket makes a hit impossible.
  const target = draws[draws.length - 1].pools[0];
  const odd = target.filter((x) => x % 2).length;
  const excluded = untilHit(game, draws, { index: -1, strategy: 'filtered', config: { ...off, odd: odd === 0 ? [1, 4] : [0, odd - 1] }, seed: 7 });
  expect(excluded.excluded).toBe(true);
  expect(excluded.failed).toEqual(['odd']);
});

test('until it hits never plays a ticket twice', () => {
  const game = smallGame(10, 3); // 120 tickets
  const draws = fakeHistory(game, 5, 3);
  let sum = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const r = untilHit(game, draws, { index: -1, strategy: 'random', seed });
    expect(r.hit && r.attempts >= 1 && r.attempts <= 120).toBe(true);
    sum += r.attempts;
  }
  // Without repeats the result is found after half of the tickets on average: (120 + 1) / 2.
  expect(Math.abs(sum / 400 - 60.5)).toBeLessThan(6);
  // Systems: every played bet is new, so the bets never exceed the 120 tickets.
  for (let seed = 1; seed <= 50; seed++) {
    const s = untilHitSystem(game, draws, { index: -1, m: 5, strategy: 'random', seed });
    expect(s.hit && (s.bets as number) <= 120 && (s.bets as number) >= s.attempts).toBe(true);
  }
});

test('system numbers whose bets all pass the filters', () => {
  const r = systemNumbers(GAMES.lotto, [], { m: 9, config: defaultFilters(GAMES.lotto.pools[0]), seed: 9 });
  expect(r.pass).toBe(84);
  expect(r.numbers).toHaveLength(9);
});

test('a past draw that does not exist', () => {
  expect(() => untilHit(smallGame(10, 3), [], { index: -1, strategy: 'random' })).toThrow('no such draw');
});
