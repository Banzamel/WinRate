export interface Coupon { id: number; drawDate: string; price: number; tickets: number[][][]; system?: number[] }

export interface SimulationSettings { tickets?: number; tests?: number; targets?: number; maxAttempts?: number; system?: number }

// Per game: which filters are on (null = the defaults), generator and simulation options, coupons.
export interface GameSettings {
  filters?: Record<string, unknown> | null;
  generator?: { count: number };
  simulation?: SimulationSettings;
  coupons?: Coupon[];
}

export interface Settings {
  language: string;
  advanced?: boolean; // the scientific extras: physics, patterns, backtests, expected value, wheels
  autoHistory?: boolean; // download new results at start (default on)
  games: Record<string, GameSettings>;
}
