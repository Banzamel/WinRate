// Checks of the history-dependent filters for one combination; each returns true when it fails.
import { rank } from '../combinatorics';
import type { HistoryContext } from './HistoryContext';

// Shares at least `v` numbers with a past draw (v = k: the draw itself, v = k-1: also near misses).
export function failsHistory(a: ArrayLike<number>, v: number, ctx: HistoryContext, sub: number[]): boolean {
  const k = ctx.k;
  if (v <= k && ctx.exact[rank(a)]) return true;
  if (v > k - 1) return false;
  for (let skip = 0; skip < k; skip++) {
    let j = 0;
    for (let t = 0; t < k; t++) if (t !== skip) sub[j++] = a[t];
    if (ctx.near[rank(sub)]) return true;
  }
  return false;
}

export function failsLastOverlap(a: ArrayLike<number>, v: number, ctx: HistoryContext): boolean {
  let shared = 0;
  for (let t = 0; t < ctx.k; t++) shared += ctx.last[a[t]];
  return shared > v;
}

export function failsNumberWeight(a: ArrayLike<number>, v: number, ctx: HistoryContext): boolean {
  let s = 0;
  for (let t = 0; t < ctx.k; t++) s += ctx.numberZ[a[t]];
  return s / ctx.k < v;
}

export function failsPairWeight(a: ArrayLike<number>, v: number, ctx: HistoryContext): boolean {
  const { k, n } = ctx;
  let s = 0;
  for (let t = 0; t < k; t++) for (let u = t + 1; u < k; u++) s += ctx.pairZ[a[t] * (n + 1) + a[u]];
  return s / ((k * (k - 1)) / 2) < v;
}
