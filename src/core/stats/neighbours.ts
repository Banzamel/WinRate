// "Which number comes next to which": in every sorted result each number and the next higher one
// drawn form a neighbour pair (e.g. 12 → 17). For a fair draw the chance that x and y > x are both
// drawn with nothing in between is C(n − (y − x + 1), k − 2) / C(n, k), so every pair has an exact
// expectation to compare with.
import { binom } from '../combinatorics';
import { chiSquare } from './chiSquare';
import type { NeighbourPair, NeighbourStats } from './types';

export function neighbourStats(size: number, pick: number, draws: number[][], { top = 12 } = {}): NeighbourStats {
  const D = draws.length;
  const w = size + 1;
  const m = new Float64Array(w * w);
  for (const nums of draws) for (let i = 1; i < nums.length; i++) m[nums[i - 1] * w + nums[i]]++;
  const all = binom(size, pick);
  const pairs: NeighbourPair[] = [];
  for (let x = 1; x <= size; x++) {
    for (let y = x + 1; y <= size; y++) {
      const expected = (D * binom(size - (y - x + 1), pick - 2)) / all;
      if (expected <= 0) continue;
      const count = m[x * w + y];
      pairs.push({ a: x, b: y, count, expected, z: (count - expected) / Math.sqrt(expected) });
    }
  }
  const fit = chiSquare(pairs.map((p) => p.count), pairs.map((p) => p.expected));
  const ranked = pairs.filter((p) => p.expected >= 5).sort((p, q) => q.z - p.z);
  // Distribution of the distance to the next drawn number (1 = neighbours on the coupon).
  const gaps = new Float64Array(size);
  const gapsExpected = new Float64Array(size);
  for (const p of pairs) { gaps[p.b - p.a] += p.count; gapsExpected[p.b - p.a] += p.expected; }
  return { fit, strongest: ranked.slice(0, top), weakest: ranked.slice(-top).reverse(), gaps: Array.from(gaps).slice(1), gapsExpected: Array.from(gapsExpected).slice(1) };
}
