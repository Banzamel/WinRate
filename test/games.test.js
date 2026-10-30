const test = require('node:test');
const assert = require('node:assert');
const { GAMES, tierOdds, combinationCount, nextDraws, eraOf, tierFor } = require('../src/main/engine/games');

test('published odds of Lotto', () => {
  const odds = Object.fromEntries(tierOdds(GAMES.lotto).map((t) => [t.id, Math.round(t.oneIn)]));
  assert.deepStrictEqual(odds, { 6: 13983816, 5: 54201, 4: 1032, 3: 57 });
});

test('published odds of Eurojackpot', () => {
  assert.strictEqual(combinationCount(GAMES.eurojackpot), 139838160);
  const odds = Object.fromEntries(tierOdds(GAMES.eurojackpot).map((t) => [t.id, Math.round(t.oneIn)]));
  assert.strictEqual(odds['5+1'], 6991908);
  assert.strictEqual(odds['2+1'], 49);
});

test('next Lotto draws fall on Tue/Thu/Sat at 22:00 Warsaw time', () => {
  const draws = nextDraws(GAMES.lotto, new Date('2026-10-30T12:00:00Z'), 3);
  assert.deepStrictEqual(draws.map((d) => d.toISOString()), ['2026-10-31T21:00:00.000Z', '2026-11-03T21:00:00.000Z', '2026-11-05T21:00:00.000Z']);
  // Summer time: 22:00 CEST = 20:00 UTC
  assert.strictEqual(nextDraws(GAMES.lotto, new Date('2026-07-01T00:00:00Z'), 1)[0].toISOString(), '2026-07-02T20:00:00.000Z');
});

test('Eurojackpot rule eras', () => {
  assert.strictEqual(eraOf(GAMES.eurojackpot, '2013-01-01').pools[1].size, 8);
  assert.strictEqual(eraOf(GAMES.eurojackpot, '2020-01-01').pools[1].size, 10);
  assert.strictEqual(eraOf(GAMES.eurojackpot, '2024-01-01').pools[1].size, 12);
});

test('tier lookup', () => {
  assert.strictEqual(tierFor(GAMES.eurojackpot, [3, 2]).id, '3+2');
  assert.strictEqual(tierFor(GAMES.eurojackpot, [1, 1]), null);
  assert.strictEqual(tierFor(GAMES.lotto, [3]).fixed, 35);
});

test('latest past draw', () => {
  const { lastDraw } = require('../src/main/engine/games');
  // Friday noon: the latest Lotto draw was Thursday 22:00 Warsaw time
  assert.strictEqual(lastDraw(GAMES.lotto, new Date('2026-10-30T12:00:00Z')).toISOString(), '2026-10-29T21:00:00.000Z');
});
