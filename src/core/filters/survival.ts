// How the real draws would have fared: each draw is checked with the history known *before* it.
import type { Draw, Pool } from '../games';
import { createChecker } from './checker';
import { FILTERS, anyOn, splitConfig } from './definitions';
import { HistoryContext } from './HistoryContext';
import type { FilterConfig, Survival } from './types';

export function historySurvival(pool: Pool, cols: number, config: FilterConfig, draws: Draw[]): Survival {
  const removed = new Array<number>(FILTERS.length).fill(0);
  let survived = 0;
  const ctx = new HistoryContext(pool);
  const dynamic = anyOn(splitConfig(config).dynamic);
  let check = createChecker(pool, cols, config, ctx);
  for (const d of draws) {
    if (dynamic) check = createChecker(pool, cols, config, ctx);
    const mask = check(d.pools[0]);
    if (!mask) survived++;
    for (let i = 0; i < FILTERS.length; i++) if (mask & (1 << i)) removed[i]++;
    ctx.add(d.pools[0]);
  }
  return {
    draws: draws.length,
    survived,
    removed: FILTERS.map((f, i) => ({ id: f.id, count: removed[i], share: draws.length ? removed[i] / draws.length : 0 })),
  };
}
