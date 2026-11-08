// Everything the screens show about a game that does not depend on the history, computed once.
import { defaultFilters, filterValues, type FilterConfig, type FilterValue } from '../../core/filters';
import { anyPrizeProbability, combinationCount, currentEra, drawsPerYear, getGame, nextDraws, tierOdds, type Era, type GamePool, type Schedule, type Tier } from '../../core/games';

export interface GameInfo {
  id: string;
  name: string;
  operator: string;
  pools: GamePool[]; // under the current rules
  eras: Era[];
  schedule: Schedule;
  price: { amount: number; currency: string };
  slipColumns: number;
  tiers: Tier[];
  combinations: number;
  anyPrize: number;
  nextDraws: string[];
  drawsPerYear: number;
  defaultFilters: FilterConfig;
  filterValues: Record<string, FilterValue>;
  sources: string[];
  typicalPrizes: Record<string, number>;
  system: { min: number; max: number } | null;
  typicalJackpot: number;
  typicalSales: number;
}

export function gameInfo(id: string, now = new Date()): GameInfo {
  const game = getGame(id);
  const era = currentEra(game);
  return {
    id: game.id, name: game.name, operator: game.operator,
    pools: era.pools.map((p, i) => ({ ...game.pools[i], ...p })),
    eras: game.eras, schedule: game.schedule, price: game.price, slipColumns: game.slipColumns,
    tiers: tierOdds(game), combinations: combinationCount(game), anyPrize: anyPrizeProbability(game),
    nextDraws: nextDraws(game, now, 4).map((d) => d.toISOString()), drawsPerYear: drawsPerYear(game),
    defaultFilters: defaultFilters(era.pools[0]), filterValues: filterValues(era.pools[0]), sources: game.sources,
    typicalPrizes: game.typicalPrizes, system: game.system || null, typicalJackpot: game.typicalJackpot, typicalSales: game.typicalSales,
  };
}

// The next draw still ahead (ISO), and its local date in the game's time zone.
export const nextDrawOf = (game: GameInfo, now = Date.now()): string =>
  game.nextDraws.find((d) => new Date(d).getTime() > now) || game.nextDraws[0];

export const nextDrawDate = (game: GameInfo): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: game.schedule.timeZone }).format(new Date(nextDrawOf(game)));
