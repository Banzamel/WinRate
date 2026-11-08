// Numbers for a system bet of m numbers whose C(m, 6) bets all pass the filters, if such numbers
// exist: random m-sets weighted like the strategy are improved by swapping one number at a time
// (hill climbing with restarts) until every bet passes. Returns the best set found and its share.
import { binom, forEachCombination } from '../combinatorics';
import { createChecker, HistoryContext, type Checker } from '../filters';
import { currentEra, eraDraws, type Draw, type Game, type Pool } from '../games';
import { createRng, type Rng } from './rng';
import { isUniform, type StrategyOptions } from './types';
import { numberWeights, weightedPick } from './weights';

export interface SystemNumbersOptions extends StrategyOptions { m: number; restarts?: number; timeLimit?: number }
export interface SystemNumbers { numbers: number[]; pass: number; total: number; share: number }

// How many bets of the system pass the filters.
function passingBets(nums: number[], pick: number, check: Checker, sub: number[]): number {
  let pass = 0;
  forEachCombination(nums.length, pick, (idx) => { for (let i = 0; i < pick; i++) sub[i] = nums[idx[i] - 1]; if (!check(sub)) pass++; });
  return pass;
}

// One climb: try every single swap, take the first that helps (positions and numbers in random order).
function climb(start: number[], pool: Pool, rng: Rng, score: (n: number[]) => number, total: number, deadline: number) {
  let nums = start; let best = score(nums);
  for (let improved = true; improved && best < total && Date.now() < deadline;) {
    improved = false;
    const order = Array.from({ length: nums.length }, (_, i) => i).sort(() => rng.next() - 0.5);
    for (const i of order) {
      const first = 1 + rng.int(pool.size);
      for (let s = 0; s < pool.size && !improved; s++) {
        const x = ((first + s - 1) % pool.size) + 1;
        if (nums.includes(x)) continue;
        const next = nums.slice(); next[i] = x; next.sort((p, q) => p - q);
        const sc = score(next);
        if (sc > best) { nums = next; best = sc; improved = true; }
      }
      if (improved) break;
    }
  }
  return { numbers: nums, pass: best };
}

export function systemNumbers(game: Game, draws: Draw[], { m, strategy = 'filtered', config, seed, restarts = 60, recent = 50, halfLife = 0, timeLimit = 8000 }: SystemNumbersOptions): SystemNumbers {
  const deadline = Date.now() + timeLimit;
  const era = eraDraws(game, draws).map((d) => d.pools[0]);
  const pool = currentEra(game).pools[0];
  const check = config ? createChecker(pool, game.slipColumns, config, new HistoryContext(pool, era)) : () => 0;
  const rng = createRng(seed);
  const weights = numberWeights(isUniform(strategy) ? 'random' : strategy, pool.size, pool.pick, era, recent, halfLife);
  const total = binom(m, pool.pick);
  const sub = new Array<number>(pool.pick);
  const score = (nums: number[]) => passingBets(nums, pool.pick, check, sub);
  let best: { numbers: number[]; pass: number } | null = null;
  for (let r = 0; r < restarts; r++) {
    const found = climb(weightedPick(rng, weights, pool.size, m, null, new Array<number>(m)).slice(), pool, rng, score, total, deadline);
    if (!best || found.pass > best.pass) best = found;
    if (found.pass === total || Date.now() >= deadline) break;
  }
  const { numbers, pass } = best as { numbers: number[]; pass: number };
  return { numbers, pass, total, share: pass / total };
}
