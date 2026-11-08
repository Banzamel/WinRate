// Tickets: generator, system bets, wheels, the player's own ticket and its expected value.
import { systemTable, wheel } from '../../../../core/bets';
import { forEachCombination } from '../../../../core/combinatorics';
import { createChecker, failedIds, HistoryContext } from '../../../../core/filters';
import { combinationCount, currentEra, eraDraws, getGame, tierOdds } from '../../../../core/games';
import { validateDraw } from '../../../../core/history';
import { createScorer, expectedValue } from '../../../../core/popularity';
import { generate, systemNumbers } from '../../../../core/simulate';
import type { Params, Progress, Result } from '../protocol';
import type { WorkerCensus } from '../WorkerCensus';

export function generateTask(p: Params<'generate'>, progress: Progress, census: WorkerCensus): Result<'generate'> {
  const g = getGame(p.game);
  const fixed = p.strategy === 'random' ? null : census.get(g, p.config, p.fixedCache, progress);
  return generate(g, p.draws, { strategy: p.strategy, config: p.config, count: p.count, fixed });
}

// A Lotto system bet: numbers (given, or chosen to pass the filters best) and its prize table.
export function systemTask({ game, draws, m, numbers, strategy, config }: Params<'system'>): Result<'system'> {
  const g = getGame(game);
  const pool = currentEra(g).pools[0];
  const chosen = numbers && numbers.length === m ? [...numbers].sort((a, b) => a - b) : systemNumbers(g, draws, { m, strategy, config }).numbers;
  const check = createChecker(pool, g.slipColumns, config, new HistoryContext(pool, eraDraws(g, draws).map((d) => d.pools[0])));
  const bets: Result<'system'>['bets'] = [];
  forEachCombination(m, pool.pick, (idx) => { const b = idx.map((i) => chosen[i - 1]); bets.push({ numbers: b, passes: !check(b) }); });
  return { numbers: chosen, table: systemTable(pool.size, pool.pick, m, tierOdds(g)), bets, price: g.price };
}

export function wheelTask({ game, numbers, guarantee }: Params<'wheel'>): Result<'wheel'> {
  return wheel(numbers, currentEra(getGame(game)).pools[0].pick, guarantee);
}

// A ticket of the player's own: the filters it breaks, how popular it is, the closest past results.
export function checkTicketTask({ game, draws, config, pools }: Params<'checkTicket'>): Result<'checkTicket'> {
  const g = getGame(game);
  const error = validateDraw(g, { date: new Date().toISOString().slice(0, 10), pools });
  if (error) return { error };
  const pool = currentEra(g).pools[0];
  const era = eraDraws(g, draws);
  const failed = failedIds(createChecker(pool, g.slipColumns, config, new HistoryContext(pool, era.map((d) => d.pools[0])))(pools[0]));
  const popularity = createScorer(pool, g.slipColumns, era.length ? era[era.length - 1].pools[0] : [])(pools[0]);
  // Most main numbers in common with any past draw (whole history), newest such draws first.
  let best = 0; let closest: typeof draws = [];
  for (let i = draws.length - 1; i >= 0; i--) {
    const n = draws[i].pools[0].filter((x) => pools[0].includes(x)).length;
    if (n > best) { best = n; closest = [draws[i]]; } else if (n === best && closest.length < 3) closest.push(draws[i]);
  }
  return { failed, popularity, best, closest };
}

// Expected value of an average ticket, of the least popular shapes, and of a given ticket.
export function evTask({ game, draws, jackpot, sold, prizes, ticket }: Params<'ev'>): Result<'ev'> {
  const g = getGame(game);
  const era = eraDraws(g, draws);
  const info = { ...g, tiers: tierOdds(g), combinations: combinationCount(g) };
  const value = (popularity: number) => expectedValue(info, { jackpot, sold, prizes, popularity });
  const score = createScorer(currentEra(g).pools[0], g.slipColumns, era.length ? era[era.length - 1].pools[0] : []);
  const pop = ticket ? score(ticket) : null;
  return { average: value(1), unpopular: value(0.3), ticket: pop === null ? null : { popularity: pop, ...value(pop) } };
}
