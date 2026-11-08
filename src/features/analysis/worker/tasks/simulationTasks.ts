// Replays of the past: walk-forward backtest and "until it hits".
import { getGame, type Game } from '../../../../core/games';
import { backtest, untilHit, untilHitSystem, type FixedCensus, type Strategy, type UntilHitResult } from '../../../../core/simulate';
import type { Params, Progress, Result } from '../protocol';
import type { WorkerCensus } from '../WorkerCensus';

export function backtestTask(p: Params<'backtest'>, progress: Progress, census: WorkerCensus): Result<'backtest'> {
  const g = getGame(p.game);
  const fixed = p.strategy === 'random' ? null : census.get(g, p.config, p.fixedCache);
  return backtest(g, p.draws, { strategy: p.strategy, config: p.config, tickets: p.tickets, tests: p.tests, fixed, onProgress: progress });
}

function playOnce(g: Game, p: Params<'untilHit'>, index: number, strategy: Strategy, fixed: FixedCensus | null, onProgress: (share: number, attempts?: number) => void): UntilHitResult {
  const census = strategy === 'random' ? null : fixed;
  return p.system
    ? untilHitSystem(g, p.draws, { index, m: p.system, strategy, config: p.config, fixed: census, maxAttempts: Math.min(p.maxAttempts, 5e7), onProgress })
    : untilHit(g, p.draws, { index, strategy, config: p.config, maxAttempts: p.maxAttempts, fixed: census, onProgress });
}

// One or more past draws, each played "until it hits". A result the filters would have thrown away
// cannot be hit with them: that draw is replayed without filters and marked with the filters that
// removed it (excludedBy).
export function untilHitTask(p: Params<'untilHit'>, progress: Progress, census: WorkerCensus): Result<'untilHit'> {
  const g = getGame(p.game);
  const fixed = p.strategy === 'random' ? null : census.get(g, p.config, p.fixedCache);
  const results = p.targets.map((index, i) => {
    const onProgress = (share: number, attempts?: number) => progress((i + share) / p.targets.length, { target: i, attempts });
    let r = playOnce(g, p, index, p.strategy, fixed, onProgress);
    if (r.excluded) r = { ...playOnce(g, p, index, 'random', null, onProgress), excludedBy: r.failed };
    progress((i + 1) / p.targets.length, { target: i });
    return r;
  });
  return { results };
}
