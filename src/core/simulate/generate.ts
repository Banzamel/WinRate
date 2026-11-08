// Tickets for the next draw with a strategy and the active filters.
import { HistoryContext } from '../filters';
import { currentEra, eraDraws, type Draw, type Game } from '../games';
import { createScorer } from '../popularity';
import { fixedCensus } from './filtering';
import { createPlayer } from './player';
import { createRng } from './rng';
import type { StrategyOptions } from './types';

export interface GenerateOptions extends StrategyOptions {
  count?: number;
  // At most this many main numbers shared by any two tickets of the set (spreads a coupon over
  // different numbers instead of near-copies); null = no limit.
  maxCommon?: number | null;
}

export interface Generated { tickets: number[][][]; popularity: number[] }

export function generate(game: Game, draws: Draw[], { strategy = 'filtered', config, count = 5, seed, recent = 50, halfLife = 0, fixed, maxCommon = null }: GenerateOptions = {}): Generated {
  const era = eraDraws(game, draws);
  const main = currentEra(game).pools[0];
  const ctx = new HistoryContext(main, era.map((d) => d.pools[0]));
  const census = fixed || (strategy !== 'random' ? fixedCensus(game, config) : null);
  const player = createPlayer(game, { strategy, config, fixed: census, ctx, draws: era, rng: createRng(seed), recent, halfLife });
  const seen = new Set<string>(); const tickets: number[][][] = [];
  for (let i = 0; i < count * 2000 && tickets.length < count; i++) {
    const t = player.next();
    if (!t) break;
    const key = t.ranks.join(':');
    if (seen.has(key)) continue;
    if (maxCommon !== null && tickets.some((tk) => tk[0].filter((x) => t.pools[0].includes(x)).length > maxCommon)) continue;
    seen.add(key); tickets.push(t.pools);
  }
  const score = createScorer(main, game.slipColumns, era.length ? era[era.length - 1].pools[0] : []);
  return { tickets, popularity: tickets.map((tk) => score(tk[0])) };
}
