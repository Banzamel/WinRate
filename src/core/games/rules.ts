// Rule eras, prize tiers and their exact odds.
import { binom, matchProbability } from '../combinatorics';
import type { Draw, Era, Game, Tier, TierRule } from './types';

// The rule era in force on a date (YYYY-MM-DD).
export function eraOf(game: Game, date: string): Era {
  let era = game.eras[0];
  for (const e of game.eras) if (date >= e.from) era = e;
  return era;
}

export const currentEra = (game: Game): Era => game.eras[game.eras.length - 1];

// Draws played under the current rules (pool sizes must match for statistics and strategies).
export const eraDraws = (game: Game, draws: Draw[]): Draw[] => draws.filter((d) => d.date >= currentEra(game).from);

// Number of different tickets (the jackpot odds are 1 in this).
export const combinationCount = (game: Game): number => game.pools.reduce((n, p) => n * binom(p.size, p.pick), 1);

// Exact probability of every prize tier for one ticket.
export function tierOdds(game: Game): Tier[] {
  return game.tiers.map((tier) => {
    const p = tier.hits.reduce((acc, hit, i) => acc * matchProbability(game.pools[i].size, game.pools[i].pick, hit), 1);
    return { ...tier, probability: p, oneIn: 1 / p };
  });
}

export const anyPrizeProbability = (game: Game): number => tierOdds(game).reduce((s, t) => s + t.probability, 0);

// Which tier a ticket wins against a draw (null: nothing). hits = matches per pool.
export function tierFor(game: Game, hits: number[]): TierRule | null {
  return game.tiers.find((t) => t.hits.every((h, i) => h === hits[i])) || null;
}

// Matches of a ticket against a draw, per pool.
export const hitsOf = (ticket: number[][], draw: number[][]): number[] =>
  ticket.map((nums, i) => nums.filter((x) => draw[i].includes(x)).length);
