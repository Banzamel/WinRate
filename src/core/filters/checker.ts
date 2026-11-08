// The checker of a filter set: bitmask of the filters a combination fails (bit i = FILTERS[i]).
import type { Pool } from '../games';
import { FILTERS, isOn } from './definitions';
import type { HistoryContext } from './HistoryContext';
import { failsHistory, failsLastOverlap, failsNumberWeight, failsPairWeight } from './historyChecks';
import { METRICS, createMeter } from './metrics';
import type { Checker, FilterConfig, FilterDef } from './types';

const HISTORY_FILTERS = new Set(['history', 'last', 'weight', 'pairs']);

function failsMetric(f: FilterDef, v: unknown, m: number[]): boolean {
  const x = m[f.metric as number];
  if (f.kind === 'range') { const [lo, hi] = v as [number, number]; return x < lo || x > hi; }
  if (f.kind === 'max') return x > (v as number);
  return x < (v as number);
}

export function createChecker(pool: Pool, cols: number, config: FilterConfig, ctx: HistoryContext | null): Checker {
  const { size: n, pick: k } = pool;
  const measure = createMeter(n, cols);
  const m = new Array<number>(METRICS.length);
  const sub = new Array<number>(k - 1);
  const active = FILTERS.map((f) => isOn(config[f.id]));
  const needsMetrics = FILTERS.some((f, i) => active[i] && f.metric !== undefined);
  const usesScores = FILTERS.some((f, i) => active[i] && (f.kind === 'weight' || f.kind === 'pairs'));
  if (ctx && usesScores) ctx.scores();
  return function check(a) {
    let mask = 0;
    if (needsMetrics) measure(a, m);
    for (let i = 0; i < FILTERS.length; i++) {
      if (!active[i]) continue;
      const f = FILTERS[i];
      const v = config[f.id];
      let fail: boolean;
      if (f.metric !== undefined) fail = failsMetric(f, v, m);
      else if (f.kind === 'flag') fail = a[k - 1] <= 31;
      else if (!HISTORY_FILTERS.has(f.kind) || !ctx || !ctx.D) fail = false;
      else if (f.kind === 'history') fail = failsHistory(a, v as number, ctx, sub);
      else if (f.kind === 'last') fail = failsLastOverlap(a, v as number, ctx);
      else if (f.kind === 'weight') fail = failsNumberWeight(a, v as number, ctx);
      else fail = failsPairWeight(a, v as number, ctx);
      if (fail) mask |= 1 << i;
    }
    return mask;
  };
}

// The ids of the filters in a mask.
export const failedIds = (mask: number): string[] => FILTERS.filter((_, i) => mask & (1 << i)).map((f) => f.id);
