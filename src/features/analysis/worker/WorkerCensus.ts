// The census of the history-independent filters inside a worker: reused while the settings stay
// the same, taken from the main thread's disk cache when it has one, and otherwise computed — then
// handed back (`fresh`) so the main thread can save it (workers cannot call Tauri).
import { splitConfig, type FilterConfig } from '../../../core/filters';
import type { Game } from '../../../core/games';
import { fixedCensus, type FixedCensus } from '../../../core/simulate';
import { censusKey } from '../censusKey';

export class WorkerCensus {
  private cache = new Map<string, FixedCensus>();
  fresh: FixedCensus | null = null;

  get(game: Game, config: FilterConfig | null, cached: FixedCensus | null, onProgress?: (share: number) => void): FixedCensus | null {
    if (!config) return null;
    const key = censusKey(game.id, config);
    const known = this.cache.get(key);
    if (known) return known;
    let result = cached && cached.key === key ? cached : null;
    if (!result) {
      const computed = fixedCensus(game, config, onProgress);
      if (!computed) return null;
      result = { ...computed, key, config: splitConfig(config).fixed };
      this.fresh = result;
    }
    if (this.cache.size > 4) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, result);
    return result;
  }
}
