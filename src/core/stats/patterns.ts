// Pattern metrics of the real draws next to their exact distribution over all combinations.
import { METRICS, createMeter, type Distributions } from '../filters';
import type { Pool } from '../games';
import { chiSquare } from './chiSquare';
import type { PatternStat } from './types';

export function patternStats(pool: Pool, cols: number, draws: number[][], expectedDist: Distributions): Record<string, PatternStat> {
  const measure = createMeter(pool.size, cols);
  const m = new Array<number>(METRICS.length);
  const observed = METRICS.map(() => new Map<number, number>());
  for (const nums of draws) {
    measure(nums, m);
    METRICS.forEach((_, i) => observed[i].set(m[i], (observed[i].get(m[i]) || 0) + 1));
  }
  const D = draws.length;
  const out: Record<string, PatternStat> = {};
  METRICS.forEach((id, i) => {
    const exp = expectedDist.metrics[id];
    const total = expectedDist.total;
    const values = exp.counts.map((_, j) => exp.from + j);
    const obs = values.map((v) => observed[i].get(v) || 0);
    const expected = exp.counts.map((c) => (c / total) * D);
    out[id] = { values, observed: obs, expected, probability: exp.counts.map((c) => c / total), fit: chiSquare(obs, expected) };
  });
  return out;
}
