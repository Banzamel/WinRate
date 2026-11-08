// Walk-forward backtest: for each of the last `tests` draws only the earlier draws are known; the
// strategy plays K tickets and they are scored against the real result, next to a plain random
// player with the same number of tickets.
import { rank } from '../combinatorics';
import { createChecker, HistoryContext, isAllowed, splitConfig } from '../filters';
import { currentEra, eraDraws, hitsOf, tierFor, type Draw, type Game } from '../games';
import { fixedCensus } from './filtering';
import { createPlayer } from './player';
import { createRng } from './rng';
import type { BacktestResult, StrategyOptions, Tally } from './types';

export interface BacktestOptions extends StrategyOptions { tickets?: number; tests?: number; onProgress?: (share: number) => void }

function score(game: Game, bucket: Tally, ticket: number[][], draw: Draw): void {
  const hits = hitsOf(ticket, draw.pools);
  const tier = tierFor(game, hits);
  const key = hits.join('+');
  bucket.bestHits[key] = (bucket.bestHits[key] || 0) + 1;
  if (tier) { bucket.tiers[tier.id]++; bucket.any++; if (tier.fixed) bucket.prize += tier.fixed; }
}

export function backtest(game: Game, draws: Draw[], { strategy = 'filtered', config, tickets = 10, tests = 100, seed, recent = 50, halfLife = 0, fixed, onProgress }: BacktestOptions = {}): BacktestResult {
  const era = eraDraws(game, draws);
  const main = currentEra(game).pools[0];
  const start = Math.max(1, era.length - tests);
  const ctx = new HistoryContext(main, era.slice(0, start).map((d) => d.pools[0]));
  const rng = createRng(seed);
  const fixedSet = strategy !== 'random' ? fixed || fixedCensus(game, config) : null;
  const tally = (): Tally => ({ tiers: Object.fromEntries(game.tiers.map((t) => [t.id, 0])), any: 0, bestHits: {}, prize: 0 });
  const result: BacktestResult = { strategy: tally(), random: tally(), draws: 0, survived: 0, tickets, from: era[start] ? era[start].date : null, to: era.length ? era[era.length - 1].date : null };
  // Would the filters have kept the winning ticket of this draw?
  const dynamic = config && strategy !== 'random' ? splitConfig(config).dynamic : null;
  const survives = (nums: number[]) => !dynamic || ((!fixedSet || isAllowed(fixedSet.allowed, rank(nums))) && createChecker(main, game.slipColumns, dynamic, ctx)(nums) === 0);
  for (let t = start; t < era.length; t++) {
    const known = era.slice(0, t);
    const draw = era[t];
    const player = createPlayer(game, { strategy, config, fixed: fixedSet, ctx, draws: known, rng, recent, halfLife });
    const randomPlayer = createPlayer(game, { strategy: 'random', ctx, draws: known, rng });
    for (let i = 0; i < tickets; i++) {
      const a = player.next(); if (a) score(game, result.strategy, a.pools, draw);
      const b = randomPlayer.next(); if (b) score(game, result.random, b.pools, draw);
    }
    if (survives(draw.pools[0])) result.survived++;
    result.draws++;
    ctx.add(draw.pools[0]);
    if (onProgress) onProgress((t - start + 1) / (era.length - start));
  }
  return result;
}
