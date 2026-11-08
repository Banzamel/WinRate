// Full report for one game: every pool's numbers; patterns, pairs and repeats for the main pool;
// the physical bias tests per pool.
import { analyze } from '../bias';
import { binom } from '../combinatorics';
import type { Distributions } from '../filters';
import { currentEra, type Draw, type Game } from '../games';
import { neighbourStats } from './neighbours';
import { numberStats } from './numbers';
import { pairStats } from './pairs';
import { patternStats } from './patterns';
import { repeatedDraws, repeatStats } from './repeats';
import type { Report } from './types';

export function report(game: Game, draws: Draw[], expectedDist: Distributions | null, { recent = 50, halfLife = 0 } = {}): Report {
  const era = currentEra(game);
  const poolDraws = (i: number) => draws.map((d) => d.pools[i]);
  const pools = game.pools.map((pool, i) => ({ key: pool.key, size: era.pools[i].size, pick: era.pools[i].pick, ...numberStats(era.pools[i].size, era.pools[i].pick, poolDraws(i), { recent }) }));
  const main = poolDraws(0);
  const { size, pick } = game.pools[0];
  return {
    draws: draws.length,
    from: draws.length ? draws[0].date : null,
    to: draws.length ? draws[draws.length - 1].date : null,
    pools,
    pairs: pairStats(size, pick, main),
    neighbours: neighbourStats(size, pick, main),
    patterns: expectedDist ? patternStats(game.pools[0], game.slipColumns, main, expectedDist) : null,
    repeats: repeatStats(size, pick, main),
    repeatedDraws: repeatedDraws(main),
    bias: game.pools.map((_, i) => (draws.length > 10 ? analyze(era.pools[i].size, era.pools[i].pick, poolDraws(i), { halfLife }) : null)),
    combinations: binom(size, pick),
  };
}
