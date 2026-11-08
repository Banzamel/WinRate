// Expected pattern distributions depend on the pool only: computed once (a worker walks every
// combination), then read from data/cache.
import type { Distributions } from '../../core/filters';
import type { DataStorage } from '../../platform';
import type { JobRunner } from './JobRunner';

export class DistributionCache {
  private memory = new Map<string, Distributions>();

  constructor(private readonly storage: DataStorage, private readonly jobs: JobRunner) {}

  async get(gameId: string): Promise<Distributions> {
    const known = this.memory.get(gameId);
    if (known) return known;
    const file = `cache/${gameId}-distributions-v2.json`;
    let dist: Distributions | null = null;
    try {
      const text = await this.storage.readText(file);
      if (text) dist = JSON.parse(text) as Distributions;
    } catch { /* not computed yet */ }
    if (!dist) {
      dist = await this.jobs.run('stats', 'distributions', { game: gameId });
      await this.storage.writeText(file, JSON.stringify(dist));
    }
    this.memory.set(gameId, dist);
    return dist;
  }
}
