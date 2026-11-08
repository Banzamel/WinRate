import { expect, test } from 'vitest';
import { createChecker, defaultFilters, HistoryContext } from '../../../src/core/filters';
import { GAMES } from '../../../src/core/games';
import { createRng, generate, STRATEGIES } from '../../../src/core/simulate';
import { fakeHistory } from '../../helpers/fakeHistory';

test('seeded rng is reproducible', () => {
  const a = createRng(5); const b = createRng(5);
  expect([a.next(), a.int(10)]).toEqual([b.next(), b.int(10)]);
});

test('seeded generator is reproducible and respects the filters', () => {
  const draws = fakeHistory(GAMES.eurojackpot, 120, 5);
  const config = defaultFilters(GAMES.eurojackpot.pools[0]);
  const a = generate(GAMES.eurojackpot, draws, { strategy: 'filtered', config, count: 5, seed: 42 });
  expect(generate(GAMES.eurojackpot, draws, { strategy: 'filtered', config, count: 5, seed: 42 })).toEqual(a);
  expect(a.tickets).toHaveLength(5);
  const check = createChecker(GAMES.eurojackpot.pools[0], 10, config, new HistoryContext(GAMES.eurojackpot.pools[0], draws.map((d) => d.pools[0])));
  for (const [main, euro] of a.tickets) {
    expect(check(main)).toBe(0);
    expect(euro).toHaveLength(2);
    expect(euro.every((x) => x >= 1 && x <= 12)).toBe(true);
  }
  for (const strategy of STRATEGIES.filter((s) => s !== 'filtered' && s !== 'unpopular')) {
    expect(generate(GAMES.eurojackpot, draws, { strategy, config, count: 3, seed: 1 }).tickets).toHaveLength(3);
  }
});

test('generator tickets: within the filters and less popular than plain filtered ones', { timeout: 60000 }, () => {
  const game = GAMES.lotto;
  const config = defaultFilters(game.pools[0]);
  const draws = [{ date: '2026-10-29', pools: [[1, 10, 15, 16, 23, 24]] }];
  const check = createChecker(game.pools[0], game.slipColumns, config, new HistoryContext(game.pools[0], draws.map((d) => d.pools[0])));
  const unpopular = generate(game, draws, { strategy: 'unpopular', config, count: 40, seed: 1 });
  const filtered = generate(game, draws, { strategy: 'filtered', config, count: 40, seed: 1 });
  expect(unpopular.tickets.every((tk) => !check(tk[0]))).toBe(true);
  const avg = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  expect(avg(unpopular.popularity)).toBeLessThan(avg(filtered.popularity));
});

test('tickets of a coupon share at most maxCommon numbers', () => {
  const { tickets } = generate(GAMES.lotto, [], { strategy: 'random', count: 8, seed: 4, maxCommon: 1 });
  expect(tickets).toHaveLength(8);
  for (let i = 0; i < tickets.length; i++) for (let j = i + 1; j < tickets.length; j++) {
    expect(tickets[i][0].filter((x) => tickets[j][0].includes(x)).length).toBeLessThanOrEqual(1);
  }
});
