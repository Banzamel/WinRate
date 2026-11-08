// Per-number weights of a strategy and weighted drawing of numbers.
import { posterior } from '../bias';
import type { Rng } from './rng';
import type { Strategy } from './types';

// Weights for one pool from the history known so far. recent: window (draws) of hot/cold.
export function numberWeights(strategy: Strategy, size: number, pick: number, draws: number[][], recent = 50, halfLife = 0): Float64Array {
  const w = new Float64Array(size + 1);
  if (strategy === 'bayes') {
    // Estimated physical chance of each ball (empirical Bayes; equal for a fair machine).
    for (const x of posterior(size, pick, draws, { halfLife }).numbers) w[x.n] = x.p;
    return w;
  }
  const count = new Float64Array(size + 1);
  const recentCount = new Float64Array(size + 1);
  const lastSeen = new Float64Array(size + 1).fill(-1);
  draws.forEach((nums, t) => {
    for (const x of nums) { count[x]++; lastSeen[x] = t; if (t >= draws.length - recent) recentCount[x]++; }
  });
  for (let x = 1; x <= size; x++) {
    if (strategy === 'hot') w[x] = recentCount[x] + 1;
    else if (strategy === 'cold') w[x] = 1 / (recentCount[x] + 1);
    else if (strategy === 'overdue') w[x] = (lastSeen[x] < 0 ? draws.length : draws.length - 1 - lastSeen[x]) + 1;
    else if (strategy === 'frequent' || strategy === 'pairs') w[x] = count[x] + 1;
    else w[x] = 1;
  }
  return w;
}

export type Affinity = (x: number, y: number) => number;

// Draws `pick` distinct numbers with probability proportional to the weights.
// affinity (optional): extra weight of y once x is chosen, affinity(x, y) > 0.
export function weightedPick(rng: Rng, weights: Float64Array, size: number, pick: number, affinity: Affinity | null, out: number[] = new Array<number>(pick)): number[] {
  const w = Float64Array.from(weights);
  for (let i = 0; i < pick; i++) {
    let total = 0;
    for (let x = 1; x <= size; x++) total += w[x];
    let r = rng.next() * total; let x = 1;
    for (; x < size; x++) { r -= w[x]; if (r < 0) break; }
    while (w[x] === 0) x--; // rounding at the very end of the range
    out[i] = x;
    w[x] = 0;
    if (affinity) for (let y = 1; y <= size; y++) if (w[y]) w[y] *= affinity(x, y);
  }
  return out.sort((a, b) => a - b);
}
