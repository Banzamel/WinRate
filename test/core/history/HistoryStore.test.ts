import { expect, test } from 'vitest';
import { GAMES } from '../../../src/core/games';
import { HistoryStore, type HistoryIo } from '../../../src/core/history';

// The store over an in-memory "folder" (the app stores the files through Tauri).
const memoryIo = (): HistoryIo & { files: Map<string, string> } => {
  const files = new Map<string, string>();
  return { files, read: (name) => files.get(name) ?? null, write: (name, text) => { files.set(name, text); } };
};

test('store keeps several draws of one date (Lotto drew twice a day in 1965–1991)', async () => {
  const io = memoryIo();
  const store = await HistoryStore.open(GAMES.lotto, io);
  const a = { date: '1980-01-06', pools: [[1, 2, 3, 4, 5, 6]] };
  const b = { date: '1980-01-06', pools: [[7, 8, 9, 10, 11, 12]] };
  // An older store kept only the first draw of the day; the full source adds the second one.
  await store.merge([a]);
  expect(await store.merge([a, b], { replace: true })).toEqual({ added: 1, changed: 0, total: 2 });
  expect(await store.merge([a, b], { replace: true })).toEqual({ added: 0, changed: 0, total: 2 });
  expect((await HistoryStore.open(GAMES.lotto, io)).list()).toEqual([a, b]);
  expect(await store.remove(b.date, b.pools)).toBe(true);
  expect(store.list()).toEqual([a]);
  // A store saved by an older version (no format) asks for one full download.
  await io.write('lotto.json', JSON.stringify({ game: 'lotto', draws: [a] }));
  const old = await HistoryStore.open(GAMES.lotto, io);
  expect(old.outdated).toBe(true);
  await old.save();
  expect((await HistoryStore.open(GAMES.lotto, io)).outdated).toBe(false);
});

test('store merges by date and persists', async () => {
  const io = memoryIo();
  const store = await HistoryStore.open(GAMES.lotto, io);
  expect(await store.merge([{ date: '2020-01-02', pools: [[1, 2, 3, 4, 5, 6]] }, { date: '2020-01-01', pools: [[7, 8, 9, 10, 11, 12]] }])).toEqual({ added: 2, changed: 0, total: 2 });
  expect((await store.merge([{ date: '2020-01-02', pools: [[1, 2, 3, 4, 5, 7]] }])).changed).toBe(0);
  expect((await store.merge([{ date: '2020-01-02', pools: [[1, 2, 3, 4, 5, 7]] }], { replace: true })).changed).toBe(1);
  const again = await HistoryStore.open(GAMES.lotto, io);
  expect(again.list().map((d) => d.date)).toEqual(['2020-01-01', '2020-01-02']);
  expect(await again.remove('2020-01-01')).toBe(true);
  expect((await HistoryStore.open(GAMES.lotto, io)).list()).toHaveLength(1);
});

test('invalid draws are skipped and an unreadable file starts empty', async () => {
  const io = memoryIo();
  io.files.set('lotto.json', '{broken');
  const store = await HistoryStore.open(GAMES.lotto, io);
  expect(store.list()).toEqual([]);
  expect(await store.merge([{ date: '2020-01-01', pools: [[1, 2, 3]] }])).toEqual({ added: 0, changed: 0, total: 0 });
});
