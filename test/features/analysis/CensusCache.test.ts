import { expect, test } from 'vitest';
import { defaultFilters } from '../../../src/core/filters';
import { GAMES } from '../../../src/core/games';
import { CensusCache, censusKey } from '../../../src/features/analysis';
import type { DataStorage } from '../../../src/platform';
import { sha1 } from '../../../src/shared/lib/sha1';

function memoryStorage(): DataStorage & { files: Map<string, string | Uint8Array> } {
  const files = new Map<string, string | Uint8Array>();
  return {
    files,
    readText: async (p) => (typeof files.get(p) === 'string' ? (files.get(p) as string) : null),
    writeText: async (p, t) => { files.set(p, t); },
    readBytes: async (p) => (files.get(p) instanceof Uint8Array ? (files.get(p) as Uint8Array) : null),
    writeBytes: async (p, b) => { files.set(p, b); },
  };
}

test('a saved census is read back by a new cache under the Electron-era file name', async () => {
  const storage = memoryStorage();
  const config = defaultFilters(GAMES.lotto.pools[0]);
  const key = censusKey('lotto', config);
  const census = { key, total: 10, allowed: new Uint8Array([1, 2]), allowedCount: 3, filters: [] };
  await new CensusCache(storage).save(census);
  expect([...storage.files.keys()]).toContain(`combinations/lotto-${sha1(key).slice(0, 16)}.bin`);
  const loaded = await new CensusCache(storage).load('lotto', config);
  expect(loaded?.allowedCount).toBe(3);
  expect([...(loaded?.allowed || [])]).toEqual([1, 2]);
  expect(await new CensusCache(storage).load('lotto', { ...config, odd: null })).toBeNull();
  expect(await new CensusCache(storage).load('lotto', null)).toBeNull();
});
