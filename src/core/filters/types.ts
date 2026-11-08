export type FilterKind = 'range' | 'max' | 'min' | 'flag' | 'history' | 'last' | 'weight' | 'pairs';

// `kind`: range [min,max] on a metric, max / min on a metric, flag (on/off), or a history/weight threshold.
export interface FilterDef { id: string; kind: FilterKind; metric?: number }

export type FilterValue = number | [number, number] | boolean;
// A null (or missing / false) value switches the filter off.
export type FilterConfig = Record<string, FilterValue | null | undefined>;

// Bitmask of the filters a combination fails (bit i = FILTERS[i]); 0 means it passes.
export type Checker = (combo: ArrayLike<number>) => number;

export interface FilterCount { id: string; removed: number; share: number }

// Exact census of a filter set over every combination of a pool.
export interface Census {
  total: number;
  allowed: Uint8Array; // bitset indexed by combination rank
  allowedCount: number;
  filters: FilterCount[];
}

// Distribution of every pattern metric over all combinations, trimmed to the values that occur.
export interface Distributions {
  total: number;
  metrics: Record<string, { from: number; counts: number[] }>;
}

export interface Survival {
  draws: number;
  survived: number;
  removed: { id: string; count: number; share: number }[];
}
