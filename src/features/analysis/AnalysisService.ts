// The analysis calls of the screens: each picks the game's history and active filters, runs the
// work in a worker lane and returns the result.
import { resolveFilters, type FilterConfig } from '../../core/filters';
import { currentEra, getGame, type Draw } from '../../core/games';
import type { Strategy } from '../../core/simulate';
import type { HistoryService } from '../history';
import type { SettingsService } from '../settings';
import type { CensusCache } from './CensusCache';
import type { DistributionCache } from './DistributionCache';
import type { JobRunner } from './JobRunner';
import type { Params } from './worker/protocol';

export class AnalysisService {
  constructor(
    private readonly jobs: JobRunner,
    private readonly history: HistoryService,
    private readonly settings: SettingsService,
    private readonly census: CensusCache,
    private readonly dists: DistributionCache,
  ) {}

  private draws(id: string): Draw[] { return this.history.list(id); }

  // The filters switched on, always with their fixed values.
  configFor(id: string, saved: Record<string, unknown> | null | undefined = this.settings.game(id).filters): FilterConfig {
    return resolveFilters(currentEra(getGame(id)).pools[0], saved);
  }

  private async withCensus(id: string, strategy: Strategy) {
    const config = this.configFor(id);
    return { game: id, draws: this.draws(id), config, strategy, fixedCache: strategy === 'random' ? null : await this.census.load(id, config) };
  }

  async report(id: string, recent = 50, halfLife = 0) {
    const dist = await this.dists.get(id);
    return this.jobs.run('stats', 'report', { game: id, draws: this.draws(id), dist, recent, halfLife });
  }

  filters(id: string, onOff: Record<string, boolean>) {
    return this.jobs.run('filters', 'filters', { game: id, draws: this.draws(id), config: this.configFor(id, onOff) });
  }

  async generate(id: string, count: number, strategy: Strategy) {
    return this.jobs.run('generate', 'generate', { ...(await this.withCensus(id, strategy)), count });
  }

  async backtest(id: string, strategy: Strategy, tickets: number, tests: number) {
    return this.jobs.run('sim', 'backtest', { ...(await this.withCensus(id, strategy)), tickets, tests });
  }

  async untilHit(id: string, strategy: Strategy, opts: Pick<Params<'untilHit'>, 'targets' | 'maxAttempts' | 'system'>) {
    return this.jobs.run('sim', 'untilHit', { ...(await this.withCensus(id, strategy)), ...opts });
  }

  expectedValue(id: string, opts: Pick<Params<'ev'>, 'jackpot' | 'sold' | 'prizes' | 'ticket'>) {
    return this.jobs.run('ev', 'ev', { game: id, draws: this.draws(id), ...opts });
  }

  system(id: string, m: number, numbers: number[] | null, strategy: Strategy) {
    return this.jobs.run('generate', 'system', { game: id, draws: this.draws(id), config: this.configFor(id), m, numbers, strategy });
  }

  checkTicket(id: string, pools: number[][]) {
    return this.jobs.run('ev', 'checkTicket', { game: id, draws: this.draws(id), config: this.configFor(id), pools });
  }

  wheel(id: string, numbers: number[], guarantee: number) {
    return this.jobs.run('generate', 'wheel', { game: id, numbers, guarantee });
  }

  cancel(lane: string): void { this.jobs.cancel(lane); }
}
