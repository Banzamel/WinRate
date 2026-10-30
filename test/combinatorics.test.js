const test = require('node:test');
const assert = require('node:assert');
const { binom, rank, unrank, forEachCombination, matchProbability } = require('../src/main/engine/combinatorics');

test('binomial coefficients of the games', () => {
  assert.strictEqual(binom(49, 6), 13983816);
  assert.strictEqual(binom(50, 5), 2118760);
  assert.strictEqual(binom(12, 2), 66);
});

test('rank and unrank are inverse and follow enumeration order', () => {
  let i = 0;
  forEachCombination(12, 4, (a) => {
    assert.strictEqual(rank(a), i);
    assert.deepStrictEqual(unrank(i, 4), a);
    i++;
  });
  assert.strictEqual(i, binom(12, 4));
  assert.deepStrictEqual(unrank(binom(49, 6) - 1, 6), [44, 45, 46, 47, 48, 49]);
});

test('match probabilities of a pool sum to 1', () => {
  const sum = [0, 1, 2, 3, 4, 5, 6].reduce((s, h) => s + matchProbability(49, 6, h), 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
});
