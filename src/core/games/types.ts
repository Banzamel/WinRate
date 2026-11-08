export interface Pool { size: number; pick: number }
export interface GamePool extends Pool { key: string }
export interface Era { from: string; pools: Pool[] }

export interface TierRule { id: string; hits: number[]; fixed?: number }
export interface Tier extends TierRule { probability: number; oneIn: number }

export interface Schedule { timeZone: string; weekdays: number[]; time: string }

export interface Game {
  id: string;
  name: string;
  operator: string;
  // pools[0] is always the main pool; Eurojackpot adds a second, independent one.
  pools: GamePool[];
  // Rule eras: the pool sizes in force from a date on (history is checked against them).
  eras: Era[];
  schedule: Schedule;
  price: { amount: number; currency: string };
  tiers: TierRule[];
  system?: { min: number; max: number };
  // Coupon layout: numbers fill rows of this many columns (used by the slip-pattern filters).
  slipColumns: number;
  // Typical average pool prizes for the expected-value calculator; editable in the app.
  typicalPrizes: Record<string, number>;
  typicalJackpot: number;
  typicalSales: number;
  sources: string[];
}

// A draw: date YYYY-MM-DD and the numbers of every pool, sorted.
export interface Draw { date: string; pools: number[][] }
