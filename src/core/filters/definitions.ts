// Filter definitions and their fixed values: the user only switches filters on and off.
import type { Pool } from '../games';
import type { FilterConfig, FilterDef, FilterValue } from './types';

export const FILTERS: FilterDef[] = [
  { id: 'odd', kind: 'range', metric: 0 },
  { id: 'low', kind: 'range', metric: 1 },
  { id: 'sum', kind: 'range', metric: 2 },
  { id: 'maxRun', kind: 'max', metric: 3 },
  { id: 'maxAP', kind: 'max', metric: 4 },
  { id: 'maxDecade', kind: 'max', metric: 5 },
  { id: 'maxEnding', kind: 'max', metric: 6 },
  { id: 'maxRow', kind: 'max', metric: 7 },
  { id: 'maxCol', kind: 'max', metric: 8 },
  { id: 'minSpread', kind: 'min', metric: 9 },
  { id: 'primes', kind: 'range', metric: 10 },
  { id: 'minDecades', kind: 'min', metric: 11 },
  { id: 'maxConsPairs', kind: 'max', metric: 12 },
  { id: 'maxMod3', kind: 'max', metric: 13 },
  { id: 'maxGap', kind: 'max', metric: 14 },
  { id: 'birthdays', kind: 'flag' }, // every number 1..31 (dates): the most shared tickets
  { id: 'history', kind: 'history' }, // shares at least N numbers with a past draw
  { id: 'lastOverlap', kind: 'last' }, // at most N numbers from the previous draw
  { id: 'numberWeight', kind: 'weight' }, // average frequency z-score of the numbers below N
  { id: 'pairWeight', kind: 'pairs' }, // average pair co-occurrence z-score below N
];

export const isOn = (v: unknown): boolean => v !== null && v !== undefined && v !== false;

export function filterValues(pool: Pool): Record<string, FilterValue> {
  const { size: n, pick: k } = pool;
  const mean = (k * (n + 1)) / 2;
  const sd = Math.sqrt((k * (n - k) * (n + 1)) / 12);
  return {
    odd: [1, k - 1],
    low: [1, k - 1],
    // Only the extreme sums (about 4 %): a narrower band removed 13 % of the real draws as well.
    sum: [Math.round(mean - 2 * sd), Math.round(mean + 2 * sd)],
    maxRun: 2, maxAP: 3, maxDecade: 3, maxEnding: 3, maxRow: 3, maxCol: 3,
    minSpread: Math.round(n / 3),
    primes: [k >= 6 ? 1 : 0, k - 2],
    minDecades: k - 3,
    maxConsPairs: 1,
    maxMod3: k - 2,
    maxGap: Math.floor(n / 2),
    birthdays: true,
    history: k,
    lastOverlap: 2,
    numberWeight: -0.5,
    pairWeight: -0.5,
  };
}

// Off by default. On the full history every filter removes real draws as often as it removes
// combinations (a fair machine), so a filter is only worth it when it drops tickets crowds play.
// These remove many tickets without that reason (players avoid neighbours, so maxConsPairs even
// removes unpopular tickets) or follow the history, which carries no information on a fair machine.
const OFF_BY_DEFAULT = ['primes', 'minDecades', 'maxConsPairs', 'maxMod3', 'maxGap', 'lastOverlap', 'numberWeight', 'pairWeight'];

// Default set: the popular shapes. About a fifth of Lotto and Eurojackpot.
export function defaultFilters(pool: Pool): FilterConfig {
  const values: FilterConfig = filterValues(pool);
  for (const id of OFF_BY_DEFAULT) values[id] = null;
  return values;
}

// Saved settings only say which filters are on (old saves still hold values: any value = on);
// the values are always the fixed ones. No saved settings = the default set.
export function resolveFilters(pool: Pool, saved: Record<string, unknown> | null | undefined): FilterConfig {
  if (!saved) return defaultFilters(pool);
  const values = filterValues(pool);
  return Object.fromEntries(FILTERS.map((f) => [f.id, isOn(saved[f.id]) ? values[f.id] : null]));
}

// Filters that depend on the history (the rest depend on the numbers only).
const HISTORY_KINDS = new Set(['history', 'last', 'weight', 'pairs']);

export function splitConfig(config: FilterConfig): { fixed: FilterConfig; dynamic: FilterConfig } {
  const fixed: FilterConfig = { ...config }; const dynamic: FilterConfig = {};
  for (const f of FILTERS) {
    if (HISTORY_KINDS.has(f.kind)) { dynamic[f.id] = config[f.id]; fixed[f.id] = null; } else dynamic[f.id] = null;
  }
  return { fixed, dynamic };
}

export const anyOn = (config: FilterConfig): boolean => Object.values(config).some(isOn);
