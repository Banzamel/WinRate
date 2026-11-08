// Statistics and the filter census: exact counts over every combination.
import { census, distributions, HistoryContext, historySurvival } from '../../../../core/filters';
import { currentEra, eraDraws, getGame } from '../../../../core/games';
import { report } from '../../../../core/stats';
import type { Params, Progress, Result } from '../protocol';

export function distributionsTask({ game }: Params<'distributions'>, progress: Progress): Result<'distributions'> {
  const g = getGame(game);
  return distributions(currentEra(g).pools[0], g.slipColumns, progress);
}

export function reportTask({ game, draws, dist, recent, halfLife }: Params<'report'>): Result<'report'> {
  const g = getGame(game);
  return report(g, eraDraws(g, draws), dist, { recent, halfLife });
}

// Exact share of combinations removed (alone and together) plus how the real draws fared.
export function filtersTask({ game, draws, config }: Params<'filters'>, progress: Progress): Result<'filters'> {
  const g = getGame(game);
  const era = eraDraws(g, draws);
  const pool = currentEra(g).pools[0];
  const all = census(pool, g.slipColumns, config, new HistoryContext(pool, era.map((d) => d.pools[0])), progress);
  return { total: all.total, allowedCount: all.allowedCount, filters: all.filters, survival: historySurvival(pool, g.slipColumns, config, era) };
}
