// Census of the fixed filters on disk: data/combinations/<game>-<sha1>.bin (one bit per combination,
// Lotto 1.7 MB) + .bin.json meta, reused across starts and kept in memory while the settings stay.
// The file names are the ones the Electron versions wrote, so their caches carry over.
import type { FilterConfig } from '../../core/filters';
import type { FixedCensus } from '../../core/simulate';
import type { DataStorage } from '../../platform';
import { sha1 } from '../../shared/lib/sha1';
import { censusKey } from './censusKey';

const fileOf = (key: string) => `combinations/${key.split(':')[0]}-${sha1(key).slice(0, 16)}.bin`;

export class CensusCache {
  private memory = new Map<string, FixedCensus>();

  constructor(private readonly storage: DataStorage, private readonly size = 4) {}

  async load(gameId: string, config: FilterConfig | null): Promise<FixedCensus | null> {
    if (!config) return null;
    const key = censusKey(gameId, config);
    const known = this.memory.get(key);
    if (known) return known;
    try {
      const [meta, allowed] = await Promise.all([this.storage.readText(`${fileOf(key)}.json`), this.storage.readBytes(fileOf(key))]);
      if (!meta || !allowed) return null;
      const parsed = JSON.parse(meta) as Omit<FixedCensus, 'allowed'>;
      if (parsed.key !== key) return null;
      return this.remember({ ...parsed, allowed });
    } catch {
      return null;
    }
  }

  async save(census: FixedCensus): Promise<void> {
    if (!census.key) return;
    this.remember(census);
    const { allowed, ...meta } = census;
    try {
      await this.storage.writeBytes(fileOf(census.key), allowed);
      await this.storage.writeText(`${fileOf(census.key)}.json`, JSON.stringify(meta));
    } catch { /* the cache is optional */ }
  }

  private remember(census: FixedCensus): FixedCensus {
    if (this.memory.size >= this.size) this.memory.delete(this.memory.keys().next().value as string);
    if (census.key) this.memory.set(census.key, census);
    return census;
  }
}
