// Every combination of the main pool is checked once (Lotto: 13 983 816, Eurojackpot: 2 118 760),
// so the share each filter removes is exact, not estimated.
import { binom, forEachCombination } from '../combinatorics';
import type { Pool } from '../games';
import { createChecker } from './checker';
import { FILTERS } from './definitions';
import type { HistoryContext } from './HistoryContext';
import type { Census, FilterConfig } from './types';

export type ProgressFn = (share: number) => void;

export const isAllowed = (allowed: Uint8Array, r: number): number => (allowed[r >> 3] >> (r & 7)) & 1;

// The bitset of allowed ranks, how many combinations each filter removes on its own (overlaps
// counted in each) and how many the whole set removes.
export function census(pool: Pool, cols: number, config: FilterConfig, ctx: HistoryContext | null, onProgress?: ProgressFn): Census {
  const { size: n, pick: k } = pool;
  const total = binom(n, k);
  const allowed = new Uint8Array(Math.ceil(total / 8));
  const check = createChecker(pool, cols, config, ctx);
  const removed = new Float64Array(FILTERS.length);
  let allowedCount = 0;
  let r = 0;
  forEachCombination(n, k, (a) => {
    let mask = check(a);
    if (mask === 0) { allowed[r >> 3] |= 1 << (r & 7); allowedCount++; }
    while (mask) { const i = 31 - Math.clz32(mask); removed[i]++; mask &= ~(1 << i); }
    r++;
    if (onProgress && (r & 0xfffff) === 0) onProgress(r / total);
  });
  return {
    total, allowed, allowedCount,
    filters: FILTERS.map((f, i) => ({ id: f.id, removed: removed[i], share: removed[i] / total })),
  };
}
