// "Until it hits" for a past draw `index` (only the draws before it are known): tickets are drawn
// number by number; one that breaks the filters or was already played is not played. Every played
// ticket is remembered, so none is played twice, and the search goes on until one is the result —
// the honest price of "drawing until it hits".
import { binom, rank } from '../combinatorics';
import { HistoryContext, isAllowed } from '../filters';
import { currentEra, eraDraws, type Draw, type Game } from '../games';
import { drawNumbers, newBag, setBit, testBit } from './bag';
import { dynamicChecker, failedFilters, fixedCensus } from './filtering';
import { createRng } from './rng';
import type { Progress, StrategyOptions, UntilHitResult } from './types';

export interface UntilHitOptions extends StrategyOptions { index: number; maxAttempts?: number; onProgress?: Progress; shouldStop?: () => boolean }

export function targetOf(game: Game, draws: Draw[], index: number): { era: Draw[]; index: number; target: Draw } {
  const era = eraDraws(game, draws);
  const i = index < 0 ? index + era.length : index;
  const target = era[i];
  if (!target) throw new Error('no such draw');
  return { era, index: i, target };
}

export function untilHit(game: Game, draws: Draw[], { index, strategy = 'filtered', config, maxAttempts = 2e8, seed, fixed, onProgress, shouldStop }: UntilHitOptions): UntilHitResult {
  const { era, index: at, target } = targetOf(game, draws, index);
  const pools = currentEra(game).pools;
  const ctx = new HistoryContext(pools[0], era.slice(0, at).map((d) => d.pools[0]));
  const filters = strategy !== 'random' && config ? config : null;
  const base = { date: target.date, numbers: target.pools, strategy, combinations: pools.reduce((n, p) => n * binom(p.size, p.pick), 1) };
  if (filters) {
    const failed = failedFilters(game, filters, ctx, target.pools[0]);
    if (failed.length) return { ...base, excluded: true, failed, attempts: 0 };
  }
  const fixedSet = filters ? fixed || fixedCensus(game, filters) : null;
  const checkDynamic = filters ? dynamicChecker(game, filters, ctx) : null;
  // A ticket is one number: main rank, then the rank of every extra pool (Eurojackpot: Euro numbers).
  const radix = pools.map((p) => binom(p.size, p.pick));
  const played = new Uint8Array(Math.ceil(base.combinations / 8));
  const targetKey = target.pools.reduce((key, nums, i) => key * radix[i] + rank(nums), 0);
  const allowed = (fixedSet ? fixedSet.allowedCount : radix[0]) * radix.slice(1).reduce((a, b) => a * b, 1);
  const rng = createRng(seed);
  const bags = pools.map((p) => newBag(p.size));
  const bufs = pools.map((p) => new Array<number>(p.pick));
  const started = Date.now();
  let attempts = 0; let rejected = 0; let repeats = 0; let tries = 0;
  const result = (extra: Partial<UntilHitResult>): UntilHitResult => ({ ...base, attempts, rejected, repeats, expectedUniform: (allowed + 1) / 2, ms: Date.now() - started, ...extra });
  for (;;) {
    tries++;
    if ((tries & 0xfffff) === 0) {
      if (onProgress) onProgress(Math.min(1, attempts / Math.min(maxAttempts, allowed)), attempts);
      if (shouldStop && shouldStop()) return result({ hit: false, stopped: true });
    }
    const nums = drawNumbers(rng, bags[0], pools[0].pick, bufs[0]);
    const r = rank(nums);
    if ((fixedSet && !isAllowed(fixedSet.allowed, r)) || (checkDynamic && checkDynamic(nums))) { rejected++; continue; }
    let key = r;
    for (let i = 1; i < pools.length; i++) key = key * radix[i] + rank(drawNumbers(rng, bags[i], pools[i].pick, bufs[i]));
    if (testBit(played, key)) { repeats++; continue; }
    setBit(played, key);
    attempts++;
    if (key === targetKey) return result({ hit: true });
    if (attempts >= maxAttempts) return result({ hit: false });
    if (attempts >= allowed) return result({ hit: false, gaveUp: true });
  }
}
