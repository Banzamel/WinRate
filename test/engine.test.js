const test = require('node:test');
const assert = require('node:assert');
const { GAMES } = require('../src/main/engine/games');
const { binom, forEachCombination } = require('../src/main/engine/combinatorics');
const { createMeter, defaultFilters, filterValues, resolveFilters, createChecker, census, distributions, HistoryContext, historySurvival } = require('../src/main/engine/filters');
const { chiSquare, numberStats, pairStats } = require('../src/main/engine/stats');
const { createRng, generate, backtest, untilHit } = require('../src/main/engine/simulate');

// A small 6-of-20 game keeps the exhaustive checks fast.
const SMALL = { size: 20, pick: 6 };
const fakeHistory = (game, n, seed = 1) => {
  const rng = createRng(seed);
  const from = Date.parse(game.eras[game.eras.length - 1].from);
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(from + i * 86400000 * 3).toISOString().slice(0, 10),
    pools: game.eras[game.eras.length - 1].pools.map((p) => { const s = new Set(); while (s.size < p.pick) s.add(1 + rng.int(p.size)); return [...s].sort((a, b) => a - b); }),
  }));
};

test('pattern metrics', () => {
  const m = createMeter(49, 7);
  // odd, low, sum, maxRun, maxAP, maxDecade, maxEnding, maxRow, maxCol, spread
  assert.deepStrictEqual(m([1, 2, 3, 4, 5, 6], []), [3, 6, 21, 6, 6, 6, 1, 6, 1, 5, 3, 1, 5, 2, 1]);
  // primes, decades, neighbour pairs, most with one remainder mod 3, largest gap
  assert.deepStrictEqual(m([2, 9, 15, 27, 40, 49], []).slice(10), [1, 4, 0, 3, 13]);
  assert.deepStrictEqual(m([3, 10, 17, 24, 30, 45], []).slice(4, 5), [4]);
  assert.strictEqual(m([5, 10, 15, 20, 25, 49], [])[4], 5);
});

test('census counts exactly what the checker removes', () => {
  const config = { ...Object.fromEntries(Object.keys(defaultFilters(SMALL)).map((k) => [k, null])), odd: [1, 5], maxRun: 2 };
  const res = census(SMALL, 5, config, null);
  const check = createChecker(SMALL, 5, config, null);
  let kept = 0;
  forEachCombination(20, 6, (a) => { if (!check(a)) kept++; });
  assert.strictEqual(res.allowedCount, kept);
  assert.strictEqual(res.total, binom(20, 6));
  // all-odd + all-even 6-of-20: 2 * C(10,6)
  assert.strictEqual(res.filters.find((f) => f.id === 'odd').removed, 2 * binom(10, 6));
});

test('expected distributions add up to all combinations', () => {
  const d = distributions(SMALL, 5);
  for (const m of Object.values(d.metrics)) assert.strictEqual(m.counts.reduce((s, c) => s + c, 0), d.total);
});

test('the default filters remove about a quarter of Lotto', { timeout: 60000 }, () => {
  const res = census(GAMES.lotto.pools[0], GAMES.lotto.slipColumns, defaultFilters(GAMES.lotto.pools[0]), null);
  const removed = 1 - res.allowedCount / res.total;
  assert.ok(removed > 0.22 && removed < 0.30, `removed ${removed}`);
});

test('history filter removes past draws and near misses', () => {
  const ctx = new HistoryContext(SMALL, [[1, 4, 7, 10, 13, 16]]);
  const off = Object.fromEntries(Object.keys(defaultFilters(SMALL)).map((k) => [k, null]));
  assert.ok(createChecker(SMALL, 5, { ...off, history: 6 }, ctx)([1, 4, 7, 10, 13, 16]));
  assert.ok(!createChecker(SMALL, 5, { ...off, history: 6 }, ctx)([1, 4, 7, 10, 13, 17]));
  assert.ok(createChecker(SMALL, 5, { ...off, history: 5 }, ctx)([1, 4, 7, 10, 13, 17]));
  assert.ok(createChecker(SMALL, 5, { ...off, lastOverlap: 2 }, ctx)([1, 4, 7, 2, 3, 5].sort((a, b) => a - b)));
});

test('a fair history keeps draws as often as combinations (efficiency ~ 1)', () => {
  const pool = { size: 20, pick: 6 };
  const game = { ...GAMES.lotto, pools: [pool], eras: [{ from: '2000-01-01', pools: [pool] }] };
  const draws = fakeHistory(game, 3000, 9);
  const config = { ...Object.fromEntries(Object.keys(defaultFilters(pool)).map((k) => [k, null])), odd: [2, 4], maxRun: 2 };
  const kept = census(pool, 5, config, null).allowedCount / binom(20, 6);
  const s = historySurvival(pool, 5, config, draws);
  assert.ok(Math.abs(s.survived / s.draws - kept) < 0.04, `${s.survived / s.draws} vs ${kept}`);
});

test('chi-square p-values', () => {
  assert.strictEqual(chiSquare([10, 10, 10, 10], [10, 10, 10, 10]).p, 1);
  assert.ok(chiSquare([20, 0, 10, 10], [10, 10, 10, 10]).p < 0.001);
  const fair = numberStats(49, 6, fakeHistory(GAMES.lotto, 2000, 3).map((d) => d.pools[0]));
  assert.ok(fair.fit.p > 0.001);
  assert.ok(Math.abs(fair.expected - (2000 * 6) / 49) < 1e-9);
  const pairs = pairStats(49, 6, fakeHistory(GAMES.lotto, 500, 4).map((d) => d.pools[0]));
  assert.ok(Math.abs(pairs.expected - (500 * 30) / (49 * 48)) < 1e-9);
});

test('seeded generator is reproducible and respects the filters', () => {
  const draws = fakeHistory(GAMES.eurojackpot, 120, 5);
  const config = defaultFilters(GAMES.eurojackpot.pools[0]);
  const a = generate(GAMES.eurojackpot, draws, { strategy: 'filtered', config, count: 5, seed: 42 });
  const b = generate(GAMES.eurojackpot, draws, { strategy: 'filtered', config, count: 5, seed: 42 });
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.tickets.length, 5);
  const check = createChecker(GAMES.eurojackpot.pools[0], 10, config, new HistoryContext(GAMES.eurojackpot.pools[0], draws.map((d) => d.pools[0])));
  for (const [main, euro] of a.tickets) {
    assert.strictEqual(check(main), 0);
    assert.strictEqual(euro.length, 2);
    assert.ok(euro.every((x) => x >= 1 && x <= 12));
  }
  for (const strategy of ['hot', 'cold', 'overdue', 'frequent', 'pairs', 'random']) {
    assert.strictEqual(generate(GAMES.eurojackpot, draws, { strategy, config, count: 3, seed: 1 }).tickets.length, 3);
  }
});

test('backtest and until-hit', { timeout: 120000 }, () => {
  const pool = { size: 20, pick: 4 };
  const game = { ...GAMES.lotto, pools: [pool], eras: [{ from: '2000-01-01', pools: [pool] }], tiers: [{ id: '4', hits: [4] }, { id: '3', hits: [3] }], slipColumns: 5 };
  const draws = fakeHistory(game, 60, 11);
  const off = Object.fromEntries(Object.keys(defaultFilters(pool)).map((k) => [k, null]));
  const bt = backtest(game, draws, { strategy: 'filtered', config: { ...off, odd: [1, 3] }, tickets: 5, tests: 20, seed: 3 });
  assert.strictEqual(bt.draws, 20);
  const hit = untilHit(game, draws, { index: -1, strategy: 'random', seed: 7 });
  assert.ok(hit.hit && hit.attempts > 0);
  // A filter that removes the winning ticket makes a hit impossible.
  const target = draws[draws.length - 1].pools[0];
  const odd = target.filter((x) => x % 2).length;
  const excluded = untilHit(game, draws, { index: -1, strategy: 'filtered', config: { ...off, odd: odd === 0 ? [1, 4] : [0, odd - 1] }, seed: 7 });
  assert.ok(excluded.excluded);
  assert.deepStrictEqual(excluded.failed, ['odd']);
});

test('pair test of a fair history is not flagged (small expected counts)', () => {
  const draws = fakeHistory(GAMES.eurojackpot, 480, 2).map((d) => d.pools[0]);
  assert.ok(pairStats(50, 5, draws).fit.p > 0.001);
});

test('filters are only switched on and off; their values are fixed', () => {
  const pool = GAMES.lotto.pools[0];
  const values = filterValues(pool);
  assert.deepStrictEqual(resolveFilters(pool, null), defaultFilters(pool));
  assert.strictEqual(defaultFilters(pool).maxConsPairs, null);
  // An edited value from an older save means "on" and is replaced by the fixed value.
  const r = resolveFilters(pool, { odd: [0, 6], maxRun: true, birthdays: false, maxConsPairs: 3 });
  assert.deepStrictEqual(r.odd, values.odd);
  assert.strictEqual(r.maxRun, values.maxRun);
  assert.strictEqual(r.maxConsPairs, values.maxConsPairs);
  assert.strictEqual(r.birthdays, null);
  assert.strictEqual(r.sum, null);
});
