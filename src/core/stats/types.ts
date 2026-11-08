import type { BiasAnalysis } from '../bias';

export interface Fit { chi2: number; df: number; p: number }

export interface NumberStat {
  n: number;
  count: number;
  share: number;
  z: number;
  recent: number;
  recentZ: number;
  gap: number; // draws since it last came out
  avgGap: number | null;
  maxGap: number;
  gapChance: number; // chance it has stayed out this long by luck alone
}

export interface NumberStats { draws: number; expected: number; numbers: NumberStat[]; fit: Fit; recent: number }

export interface Pair { a: number; b: number; count: number; z: number }
export interface PairStats {
  draws: number;
  expected: number;
  fit: Fit;
  never: number;
  matrix: number[]; // row-major, (size+1)^2
  strongest: Pair[];
  weakest: Pair[];
  neighbours: { count: number; expected: number };
}

export interface NeighbourPair extends Pair { expected: number }
export interface NeighbourStats { fit: Fit; strongest: NeighbourPair[]; weakest: NeighbourPair[]; gaps: number[]; gapsExpected: number[] }

export interface PatternStat { values: number[]; observed: number[]; expected: number[]; probability: number[]; fit: Fit }
export interface RepeatStats { observed: number[]; expected: number[]; fit: Fit }
export interface RepeatedDraw { numbers: number[]; at: number[] }

export interface PoolReport extends NumberStats { key: string; size: number; pick: number }

export interface Report {
  draws: number;
  from: string | null;
  to: string | null;
  pools: PoolReport[];
  pairs: PairStats;
  neighbours: NeighbourStats;
  patterns: Record<string, PatternStat> | null;
  repeats: RepeatStats;
  repeatedDraws: RepeatedDraw[];
  bias: (BiasAnalysis | null)[];
  combinations: number;
}
