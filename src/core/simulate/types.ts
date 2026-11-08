import type { Census, FilterConfig } from '../filters';

export const STRATEGIES = ['random', 'filtered', 'bayes', 'unpopular', 'hot', 'cold', 'overdue', 'frequent', 'pairs'] as const;
export type Strategy = (typeof STRATEGIES)[number];

// Strategies that pick every number with the same chance (the filters still apply).
export const isUniform = (s: Strategy): boolean => s === 'random' || s === 'filtered' || s === 'unpopular';

// Census of the history-independent filters, possibly loaded from the cache (with its key).
export type FixedCensus = Census & { key?: string; config?: FilterConfig };

export type Progress = (share: number, attempts?: number) => void;

export interface StrategyOptions {
  strategy?: Strategy;
  config?: FilterConfig | null;
  seed?: number;
  recent?: number;
  halfLife?: number;
  fixed?: FixedCensus | null;
}

export interface Tally { tiers: Record<string, number>; any: number; bestHits: Record<string, number>; prize: number }

export interface BacktestResult {
  strategy: Tally;
  random: Tally;
  draws: number;
  survived: number;
  tickets: number;
  from: string | null;
  to: string | null;
}

export interface UntilHitResult {
  date: string;
  numbers: number[][];
  strategy: Strategy;
  combinations: number;
  attempts: number;
  system?: number;
  excluded?: boolean;
  failed?: string[];
  excludedBy?: string[];
  hit?: boolean;
  stopped?: boolean;
  gaveUp?: boolean;
  rejected?: number;
  repeats?: number;
  skipped?: number;
  bets?: number;
  expectedUniform?: number;
  expectedAttempts?: number;
  ms?: number;
}
