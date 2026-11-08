// Shapes shared by the backend and the views. Engine results are passed through as `any`-typed
// records (they come from plain JS in a worker); the ones the UI builds on are named here.
export interface Draw { date: string; pools: number[][] }

export interface Pool { key?: string; size: number; pick: number }
export interface Tier { id: string; hits: number[]; fixed?: number; probability: number; oneIn: number }
export interface Era { from: string; pools: Pool[] }

export interface GameInfo {
  id: string;
  name: string;
  operator: string;
  pools: Pool[];
  eras: Era[];
  schedule: { timeZone: string; weekdays: number[]; time: string };
  price: { amount: number; currency: string };
  slipColumns: number;
  tiers: Tier[];
  combinations: number;
  anyPrize: number;
  nextDraws: string[];
  drawsPerYear: number;
  defaultFilters: Record<string, unknown>;
  filterValues: Record<string, any>;
  sources: string[];
  typicalPrizes: Record<string, number>;
  system: { min: number; max: number } | null;
  typicalJackpot: number;
  typicalSales: number;
}

export interface Coupon { id: number; drawDate: string; price: number; tickets: number[][][]; system?: number[] }

export interface GameSettings {
  filters?: Record<string, unknown> | null;
  generator?: { count: number };
  simulation?: Record<string, number | string>;
  coupons?: Coupon[];
}

export interface Settings {
  language: string;
  advanced?: boolean;
  autoHistory?: boolean;
  games: Record<string, GameSettings>;
}

export interface FilterDef { id: string; kind: string }

export interface AppUpdate { state: string; current?: string; version?: string; pct?: number; error?: string }

export interface HistoryAuto { game: string; state: 'downloading' | 'done' | 'error'; added?: number; changed?: number; total?: number; error?: string }

// Result of history changes (download, import, add).
export interface MergeResult { added: number; changed: number; total: number; skipped?: number; url?: string; file?: string; error?: string }
