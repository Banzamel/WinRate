const test = require('node:test');
const assert = require('node:assert');
const { GAMES, tierOdds, combinationCount } = require('../src/main/engine/games');
const { posterior, analyze, memory, kolmogorovP } = require('../src/main/engine/bias');
const { createScorer, jackpotShare, expectedValue } = require('../src/main/engine/popularity');
const { wheel } = require('../src/main/engine/wheel');
const { createRng } = require('../src/main/engine/simulate');
const { binom } = require('../src/main/engine/combinatorics');

const draws = (n, seed, size = 49, pick = 6, heavy = null, extra = 0) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => {
    const s = new Set();
    if (heavy && rng.next() < extra) s.add(heavy);
    while (s.size < pick) s.add(1 + rng.int(size));
    return [...s].sort((a, b) => a - b);
  });
};

test('a fair machine gives exactly fair estimates (no winner\'s curse)', () => {
  for (const seed of [1, 2, 3]) {
    const a = analyze(49, 6, draws(3000, seed));
    assert.strictEqual(a.posterior.shrink, 0);
    assert.ok(Math.abs(a.best.edge - 1) < 1e-9);
  }
});

test('a biased ball is found', () => {
  const post = posterior(49, 6, draws(3000, 5, 49, 6, 13, 0.06));
  const top = [...post.numbers].sort((a, b) => b.p - a.p)[0];
  assert.strictEqual(top.n, 13);
  assert.ok(top.edge > 0.1);
});

test('memory and Kolmogorov law', () => {
  assert.ok(memory(49, 6, draws(2000, 7)).every((l) => Math.abs(l.z) < 4));
  assert.ok(Math.abs(kolmogorovP(1.36) - 0.049) < 0.002); // the 5 % critical value
});

test('popularity: patterns are popular, scattered high numbers are not', () => {
  const score = createScorer(GAMES.lotto.pools[0], 7, []);
  assert.ok(score([1, 2, 3, 4, 5, 6]) > 500);
  assert.ok(score([5, 14, 33, 38, 42, 47]) < 1);
  assert.ok(score([3, 7, 12, 19, 25, 31]) > 1);
});

test('expected value', () => {
  assert.strictEqual(jackpotShare(1, 0, 100), 1);
  assert.ok(Math.abs(jackpotShare(1, 100, 100) - (1 - Math.exp(-1))) < 1e-12);
  const g = { ...GAMES.lotto, tiers: tierOdds(GAMES.lotto), combinations: combinationCount(GAMES.lotto) };
  const avg = expectedValue(g, { jackpot: 15e6, sold: 8e6, prizes: GAMES.lotto.typicalPrizes });
  const rare = expectedValue(g, { jackpot: 15e6, sold: 8e6, prizes: GAMES.lotto.typicalPrizes, popularity: 0.3 });
  assert.ok(avg.returnRate > 0.3 && avg.returnRate < 0.7);
  assert.ok(rare.total > avg.total);
  assert.ok(avg.breakEven > 15e6);
});

test('wheel guarantees every triple', () => {
  const nums = [1, 5, 9, 12, 17, 23, 28, 31, 36, 40];
  const w = wheel(nums, 6, 3);
  assert.ok(w.tickets.length < binom(10, 6));
  for (let a = 0; a < 10; a++) for (let b = a + 1; b < 10; b++) for (let c = b + 1; c < 10; c++) {
    const tri = [nums[a], nums[b], nums[c]];
    assert.ok(w.tickets.some((t) => tri.every((x) => t.includes(x))), `uncovered ${tri}`);
  }
});
