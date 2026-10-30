const test = require('node:test');
const assert = require('node:assert');
const { GAMES, tierOdds } = require('../src/main/engine/games');
const { systemTable } = require('../src/main/engine/system');
const { neighbourStats } = require('../src/main/engine/stats');
const { createRng, generate } = require('../src/main/engine/simulate');

test('system bet of 8 numbers', () => {
  const t = systemTable(49, 6, 8, tierOdds(GAMES.lotto));
  assert.strictEqual(t.bets, 28);
  assert.ok(Math.abs(t.rows.reduce((s, r) => s + r.probability, 0) - 1) < 1e-12);
  // all six drawn among the 8: one six, 12 fives (6·2), 15 fours (15·1)
  assert.deepStrictEqual(t.rows[6].wins, { 6: 1, 5: 12, 4: 15 });
  // three drawn among the 8: C(3,3)·C(5,3) = 10 threes
  assert.deepStrictEqual(t.rows[3].wins, { 3: 10 });
  assert.ok(Math.abs(t.jackpot - 28 / 13983816) < 1e-15);
});

test('neighbour expectations add up to all neighbour pairs', () => {
  const rng = createRng(3);
  const draws = Array.from({ length: 500 }, () => { const s = new Set(); while (s.size < 6) s.add(1 + rng.int(49)); return [...s].sort((a, b) => a - b); });
  const n = neighbourStats(49, 6, draws);
  const exp = n.gapsExpected.reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(exp - 500 * 5) < 1e-6);
  assert.strictEqual(n.gaps.reduce((s, x) => s + x, 0), 500 * 5);
  assert.ok(n.fit.p > 0.001);
});

test('tickets of a coupon share at most maxCommon numbers', () => {
  const { tickets } = generate(GAMES.lotto, [], { strategy: 'random', count: 8, seed: 4, maxCommon: 1 });
  assert.strictEqual(tickets.length, 8);
  for (let i = 0; i < tickets.length; i++) for (let j = i + 1; j < tickets.length; j++) {
    assert.ok(tickets[i][0].filter((x) => tickets[j][0].includes(x)).length <= 1);
  }
});

test('system numbers whose bets all pass the filters', () => {
  const { systemNumbers } = require('../src/main/engine/simulate');
  const { defaultFilters } = require('../src/main/engine/filters');
  const r = systemNumbers(GAMES.lotto, [], { m: 9, config: defaultFilters(GAMES.lotto.pools[0]), seed: 9 });
  assert.strictEqual(r.pass, 84);
  assert.strictEqual(r.numbers.length, 9);
});
