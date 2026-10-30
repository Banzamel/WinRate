const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { GAMES } = require('../src/main/engine/games');
const { parseLine, parseText, HistoryStore, validateDraw } = require('../src/main/engine/history');

test('parses the mbnet and CSV layouts', () => {
  assert.deepStrictEqual(parseLine(GAMES.lotto, '1. 27.01.1957 8,12,31,39,43,45'), { date: '1957-01-27', pools: [[8, 12, 31, 39, 43, 45]] });
  assert.deepStrictEqual(parseLine(GAMES.lotto, '2024-01-02;44;3;11;19;27;41'), { date: '2024-01-02', pools: [[3, 11, 19, 27, 41, 44]] });
  assert.deepStrictEqual(parseLine(GAMES.eurojackpot, '900. 29.10.2024 2,14,27,33,48,9,1'), { date: '2024-10-29', pools: [[2, 14, 27, 33, 48], [1, 9]] });
});

test('rejects numbers outside the rules of the date', () => {
  assert.strictEqual(parseLine(GAMES.eurojackpot, '01.01.2013 1,2,3,4,5,1,10'), null); // Euro numbers were 1..8 then
  assert.strictEqual(parseLine(GAMES.lotto, '01.01.2013 1,2,3,4,5,50'), null);
  assert.strictEqual(parseLine(GAMES.lotto, '01.01.2013 1,2,3,4,5,5'), null);
  assert.strictEqual(validateDraw(GAMES.lotto, { date: '2020-01-01', pools: [[1, 2, 3]] }), 'count');
  assert.strictEqual(parseText(GAMES.lotto, 'header\n1. 27.01.1957 8,12,31,39,43,45\n').skipped, 1);
});

test('store merges by date and persists', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwr-'));
  const store = new HistoryStore(GAMES.lotto, dir);
  assert.deepStrictEqual(store.merge([{ date: '2020-01-02', pools: [[1, 2, 3, 4, 5, 6]] }, { date: '2020-01-01', pools: [[7, 8, 9, 10, 11, 12]] }]), { added: 2, changed: 0, total: 2 });
  assert.strictEqual(store.merge([{ date: '2020-01-02', pools: [[1, 2, 3, 4, 5, 7]] }]).changed, 0);
  assert.strictEqual(store.merge([{ date: '2020-01-02', pools: [[1, 2, 3, 4, 5, 7]] }], { replace: true }).changed, 1);
  const again = new HistoryStore(GAMES.lotto, dir);
  assert.deepStrictEqual(again.list().map((d) => d.date), ['2020-01-01', '2020-01-02']);
  assert.ok(again.remove('2020-01-01'));
  assert.strictEqual(new HistoryStore(GAMES.lotto, dir).list().length, 1);
});
