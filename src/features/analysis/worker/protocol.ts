// Messages between the main thread and the analysis workers: one typed entry per task.
import type { FilterConfig, Distributions } from '../../../core/filters';
import type { Draw } from '../../../core/games';
import type { FixedCensus, Strategy } from '../../../core/simulate';
import type { BacktestResult, EvReport, FilterResult, Generated, Report, SystemResult, TicketCheck, UntilHitRun, Wheel } from '../types';

interface WithDraws { game: string; draws: Draw[] }
interface WithFilters extends WithDraws { config: FilterConfig }
interface WithCensus extends WithFilters { strategy: Strategy; fixedCache: FixedCensus | null }

export interface TaskMap {
  distributions: { params: { game: string }; result: Distributions };
  report: { params: WithDraws & { dist: Distributions; recent: number; halfLife: number }; result: Report };
  ev: { params: WithDraws & { jackpot: number; sold: number; prizes: Record<string, number>; ticket?: number[] }; result: EvReport };
  system: { params: WithFilters & { m: number; numbers: number[] | null; strategy: Strategy }; result: SystemResult };
  checkTicket: { params: WithFilters & { pools: number[][] }; result: TicketCheck };
  wheel: { params: { game: string; numbers: number[]; guarantee: number }; result: Wheel };
  filters: { params: WithFilters; result: FilterResult };
  generate: { params: WithCensus & { count: number }; result: Generated };
  backtest: { params: WithCensus & { tickets: number; tests: number }; result: BacktestResult };
  untilHit: { params: WithCensus & { targets: number[]; maxAttempts: number; system: number }; result: UntilHitRun };
}

export type TaskName = keyof TaskMap;
export type Params<K extends TaskName> = TaskMap[K]['params'];
export type Result<K extends TaskName> = TaskMap[K]['result'];

export type ProgressInfo = { attempts?: number; target?: number };
export type Progress = (value: number, info?: ProgressInfo) => void;

export interface Request { id: number; task: TaskName; params: unknown }
export interface Reply {
  id: number;
  progress?: number;
  info?: ProgressInfo;
  result?: unknown;
  error?: string;
  fixed?: FixedCensus | null; // a census computed by the worker, for the main thread to save
}
