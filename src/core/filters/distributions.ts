// How all combinations are distributed over the pattern metrics (what a fair draw produces). The
// statistics compare the history with it: a filter only makes sense where real draws deviate from
// it — and for a fair draw machine they do not. Depends on the pool only, so the app caches it.
import { binom, forEachCombination } from '../combinatorics';
import type { Pool } from '../games';
import type { ProgressFn } from './census';
import { METRICS, createMeter } from './metrics';
import type { Distributions } from './types';

function trim(dist: Float64Array[]): Distributions['metrics'] {
  const out: Distributions['metrics'] = {};
  METRICS.forEach((id, i) => {
    const arr = Array.from(dist[i]);
    let lo = 0; let hi = arr.length - 1;
    while (lo < hi && !arr[lo]) lo++;
    while (hi > lo && !arr[hi]) hi--;
    out[id] = { from: lo, counts: arr.slice(lo, hi + 1) };
  });
  return out;
}

export function distributions(pool: Pool, cols: number, onProgress?: ProgressFn): Distributions {
  const { size: n, pick: k } = pool;
  const total = binom(n, k);
  const measure = createMeter(n, cols);
  const m = new Array<number>(METRICS.length);
  const dist = METRICS.map(() => new Float64Array(n * k + 1));
  let r = 0;
  forEachCombination(n, k, (a) => {
    measure(a, m);
    for (let i = 0; i < METRICS.length; i++) dist[i][m[i]]++;
    r++;
    if (onProgress && (r & 0xfffff) === 0) onProgress(r / total);
  });
  return { total, metrics: trim(dist) };
}
