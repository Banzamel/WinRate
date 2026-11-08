// A ticket source for one game: next() returns { pools, ranks } or null after too many rejections.
import { binom, rank, unrank } from '../combinatorics';
import { anyOn, createChecker, isAllowed, splitConfig, type FilterConfig, type HistoryContext } from '../filters';
import { currentEra, type Draw, type Game } from '../games';
import { createScorer } from '../popularity';
import type { Rng } from './rng';
import { isUniform, type FixedCensus, type Strategy } from './types';
import { numberWeights, weightedPick, type Affinity } from './weights';

// Candidates per ticket of the "unpopular" strategy (the least popular one is kept).
const UNPOPULAR_CANDIDATES = 12;

export interface PlayerOptions {
  strategy: Strategy;
  config?: FilterConfig | null;
  fixed?: FixedCensus | null; // census of the history-independent filters, shared between draws
  ctx: HistoryContext; // for the history filters and the pair strategy
  draws: Draw[];
  rng: Rng;
  recent?: number;
  halfLife?: number;
}

export interface Player { total: number; nextRanks(): number[] | null; next(): { ranks: number[]; pools: number[][] } | null }

// A pair that came out more often than expected gets up to ~2x the weight, a rare one less.
function pairAffinity(ctx: HistoryContext, size: number): Affinity {
  ctx.scores();
  const w = size + 1;
  return (x, y) => Math.exp(0.35 * Math.max(-2, Math.min(2, x < y ? ctx.pairZ[x * w + y] : ctx.pairZ[y * w + x])));
}

export function createPlayer(game: Game, { strategy, config, fixed, ctx, draws, rng, recent, halfLife }: PlayerOptions): Player {
  const pools = currentEra(game).pools;
  const main = pools[0];
  const total = binom(main.size, main.pick);
  const useFilters = strategy !== 'random' && !!config;
  const dynamic = useFilters && config ? splitConfig(config).dynamic : null;
  const checkDynamic = dynamic && anyOn(dynamic) ? createChecker(main, game.slipColumns, dynamic, ctx) : null;
  const uniform = isUniform(strategy);
  const weights = pools.map((p, i) => (uniform ? null : numberWeights(strategy, p.size, p.pick, draws.map((d) => d.pools[i]), recent, halfLife)));
  const popularity = strategy === 'unpopular' ? createScorer(main, game.slipColumns, draws.length ? draws[draws.length - 1].pools[0] : []) : null;
  const affinity = strategy === 'pairs' ? pairAffinity(ctx, main.size) : null;
  const buf = pools.map((p) => new Array<number>(p.pick));
  const mainNumbers = new Array<number>(main.pick);

  // Main pool: a rank that passes the filters, or -1.
  const nextMain = (): number => {
    for (let tries = 0; tries < 1e6; tries++) {
      const r = weights[0] ? rank(weightedPick(rng, weights[0], main.size, main.pick, affinity, mainNumbers)) : rng.int(total);
      if (useFilters && fixed && !isAllowed(fixed.allowed, r)) continue;
      if (checkDynamic && checkDynamic(unrank(r, main.pick))) continue;
      return r;
    }
    return -1;
  };
  // Keep the least popular of several valid candidates: same chance, fewer people to share with.
  const leastPopular = (first: number, score: (t: number[]) => number): number => {
    let r = first; let best = score(unrank(r, main.pick));
    for (let i = 1; i < UNPOPULAR_CANDIDATES; i++) {
      const c = nextMain();
      if (c < 0) break;
      const s = score(unrank(c, main.pick));
      if (s < best) { best = s; r = c; }
    }
    return r;
  };
  const nextRanks = (): number[] | null => {
    const first = nextMain();
    if (first < 0) return null;
    const ranks = [popularity ? leastPopular(first, popularity) : first];
    for (let i = 1; i < pools.length; i++) {
      const p = pools[i]; const w = weights[i];
      ranks.push(w ? rank(weightedPick(rng, w, p.size, p.pick, null, buf[i])) : rng.int(binom(p.size, p.pick)));
    }
    return ranks;
  };
  return {
    total,
    nextRanks,
    next() {
      const ranks = nextRanks();
      return ranks && { ranks, pools: ranks.map((r, i) => unrank(r, pools[i].pick)) };
    },
  };
}
