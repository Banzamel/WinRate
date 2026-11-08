// The filters as the simulations use them: the fixed part as a precomputed census (bitset), the
// history part as a checker rebuilt with what was known at each draw.
import { anyOn, census, createChecker, failedIds, splitConfig, type Checker, type FilterConfig, type HistoryContext, type ProgressFn } from '../filters';
import { currentEra, type Game } from '../games';
import type { FixedCensus } from './types';

export function fixedCensus(game: Game, config: FilterConfig | null | undefined, onProgress?: ProgressFn): FixedCensus | null {
  if (!config) return null;
  return census(currentEra(game).pools[0], game.slipColumns, splitConfig(config).fixed, null, onProgress);
}

// The filters a past result breaks (with the history known before it), or [] when it passes.
export function failedFilters(game: Game, config: FilterConfig, ctx: HistoryContext, numbers: number[]): string[] {
  return failedIds(createChecker(currentEra(game).pools[0], game.slipColumns, config, ctx)(numbers));
}

// The dynamic (history) filters of a config as one checker, or null when none is on.
export function dynamicChecker(game: Game, config: FilterConfig, ctx: HistoryContext): Checker | null {
  const { dynamic } = splitConfig(config);
  return anyOn(dynamic) ? createChecker(currentEra(game).pools[0], game.slipColumns, dynamic, ctx) : null;
}
