import type { SystemTable, Wheel } from '../../core/bets';
import type { FilterCount, Survival } from '../../core/filters/types';
import type { Draw } from '../../core/games';
import type { DrawError } from '../../core/history';
import type { EvResult } from '../../core/popularity';
import type { BacktestResult, Generated, UntilHitResult } from '../../core/simulate';
import type { Report } from '../../core/stats';

export interface FilterResult { total: number; allowedCount: number; filters: FilterCount[]; survival: Survival }
export interface EvReport { average: EvResult; unpopular: EvResult; ticket: (EvResult & { popularity: number }) | null }
export interface SystemBet { numbers: number[]; passes: boolean }
export interface SystemResult { numbers: number[]; table: SystemTable; bets: SystemBet[]; price: { amount: number; currency: string } }
export type TicketCheck = { error: DrawError } | { error?: undefined; failed: string[]; popularity: number; best: number; closest: Draw[] };
export interface UntilHitRun { results: UntilHitResult[] }
export type { Wheel, Generated, BacktestResult, UntilHitResult, Report };

// Results kept per game until the history changes.
export interface AnalysisResults {
  report: Record<string, Report>;
  filters: Record<string, FilterResult>;
  tickets: Record<string, Generated>;
  backtest: Record<string, BacktestResult>;
  untilHit: Record<string, UntilHitRun>;
}

export interface JobState { progress: number; info?: { attempts?: number; target?: number } }
