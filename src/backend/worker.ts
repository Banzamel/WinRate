// Background worker: everything that walks millions of combinations runs here, so the window
// never freezes. Messages: { id, task, params } in; { id, progress } and { id, result | error } out.
// Workers cannot call Tauri, so the census of the fixed filters is read from disk by the main
// thread (params.fixedCache) and a freshly computed one is sent back (`fixed`) to be saved.
import { getGame, currentEra, tierOdds, combinationCount } from '../engine/games.js';
import * as filters from '../engine/filters.js';
import * as stats from '../engine/stats.js';
import * as simulate from '../engine/simulate.js';
import * as popularity from '../engine/popularity.js';
import { wheel } from '../engine/wheel.js';
import { systemTable } from '../engine/system.js';
import { forEachCombination } from '../engine/combinatorics.js';
import { validateDraw } from '../engine/history.js';
import { fixedKey } from './fixed-key';

// The engine is plain JS with optional-object parameters TypeScript cannot infer fully.
const sim: any = simulate;

type Progress = (value: number, info?: Record<string, unknown>) => void;
type Params = Record<string, any>;

// The census of the history-independent filters is reused while the settings stay the same.
const cache = new Map<string, any>();
let fresh: unknown = null;

function fixedFor(game: any, config: any, progress: Progress | null, cached: any) {
  if (!config) return null;
  const key = fixedKey(game.id, config);
  if (cache.has(key)) return cache.get(key);
  let result = cached && cached.key === key ? cached : null;
  if (!result) {
    result = sim.fixedCensus(game, config, progress);
    fresh = { ...result, key, config: filters.splitConfig(config).fixed };
  }
  if (cache.size > 4) cache.delete(cache.keys().next().value as string);
  cache.set(key, result);
  return result;
}

const TASKS: Record<string, (p: Params, progress: Progress) => unknown> = {
  distributions({ game }, progress) {
    const g = getGame(game);
    return filters.distributions(currentEra(g).pools[0], g.slipColumns, { onProgress: progress });
  },

  report({ game, draws, dist, recent, halfLife }) {
    const g = getGame(game);
    return stats.report(g, sim.eraDraws(g, draws), dist, { recent, halfLife });
  },

  // Expected value of an average ticket and of a given one (or the least popular shape).
  ev({ game, draws, jackpot, sold, prizes, ticket }) {
    const g = getGame(game);
    const era = sim.eraDraws(g, draws);
    const info = { ...g, tiers: tierOdds(g), combinations: combinationCount(g) };
    const score = popularity.createScorer(currentEra(g).pools[0], g.slipColumns, era.length ? era[era.length - 1].pools[0] : []);
    const pop = ticket ? score(ticket) : null;
    return {
      average: popularity.expectedValue(info, { jackpot, sold, prizes, popularity: 1 }),
      unpopular: popularity.expectedValue(info, { jackpot, sold, prizes, popularity: 0.3 }),
      ticket: ticket ? { popularity: pop, ...popularity.expectedValue(info, { jackpot, sold, prizes, popularity: pop as number }) } : null,
    };
  },

  // A Lotto system bet: numbers (given, or chosen to pass the filters best) and its prize table.
  system({ game, draws, m, numbers, strategy, config, recent, halfLife }) {
    const g = getGame(game);
    const pool = currentEra(g).pools[0];
    const chosen = numbers && numbers.length === m ? { numbers: [...numbers].sort((a: number, b: number) => a - b) } : sim.systemNumbers(g, draws, { m, strategy, config, recent, halfLife });
    const ctx = new filters.HistoryContext(pool, sim.eraDraws(g, draws).map((d: any) => d.pools[0]));
    const check = config ? filters.createChecker(pool, g.slipColumns, config, ctx) : () => 0;
    const bets: { numbers: number[]; passes: boolean }[] = [];
    forEachCombination(m, pool.pick, (idx: number[]) => { const b = idx.map((i) => chosen.numbers[i - 1]); bets.push({ numbers: b, passes: !check(b) }); });
    return { numbers: chosen.numbers, table: systemTable(pool.size, pool.pick, m, tierOdds(g)), bets, price: g.price };
  },

  // A ticket of the player's own: the filters it breaks, how popular it is, the closest past results.
  checkTicket({ game, draws, config, pools }) {
    const g = getGame(game);
    const today = new Date().toISOString().slice(0, 10);
    const error = validateDraw(g, { date: today, pools });
    if (error) return { error };
    const pool = currentEra(g).pools[0];
    const era = sim.eraDraws(g, draws);
    const ctx = new filters.HistoryContext(pool, era.map((d: any) => d.pools[0]));
    const mask = config ? filters.createChecker(pool, g.slipColumns, config, ctx)(pools[0]) : 0;
    const failed = filters.FILTERS.filter((_f: any, i: number) => mask & (1 << i)).map((f: any) => f.id);
    const score = popularity.createScorer(pool, g.slipColumns, era.length ? era[era.length - 1].pools[0] : [])(pools[0]);
    // Most main numbers in common with any past draw (whole history), newest such draws first.
    let best = 0; let closest: any[] = [];
    for (let i = draws.length - 1; i >= 0; i--) {
      const d = draws[i];
      const n = d.pools[0].filter((x: number) => pools[0].includes(x)).length;
      if (n > best) { best = n; closest = [d]; } else if (n === best && closest.length < 3) closest.push(d);
    }
    return { failed, popularity: score, best, closest };
  },

  wheel({ game, numbers, guarantee }) {
    const g = getGame(game);
    const k = currentEra(g).pools[0].pick;
    return wheel(numbers, k, guarantee);
  },

  // Exact share of combinations removed (alone and together) plus how the real draws fared.
  filters({ game, draws, config }, progress) {
    const g = getGame(game);
    const era = sim.eraDraws(g, draws);
    const pool = currentEra(g).pools[0];
    const ctx = new filters.HistoryContext(pool, era.map((d: any) => d.pools[0]));
    const all = filters.census(pool, g.slipColumns, config, ctx, { onProgress: progress });
    const survival = filters.historySurvival(pool, g.slipColumns, config, era);
    return { total: all.total, allowedCount: all.allowedCount, filters: all.filters, survival };
  },

  generate({ game, draws, strategy, config, count, recent, halfLife, maxCommon, fixedCache }, progress) {
    const g = getGame(game);
    return sim.generate(g, draws, { strategy, config, count, recent, halfLife, maxCommon, fixed: strategy === 'random' ? null : fixedFor(g, config, progress, fixedCache) });
  },

  backtest({ game, draws, strategy, config, tickets, tests, recent, halfLife, fixedCache }, progress) {
    const g = getGame(game);
    const fixed = strategy === 'random' ? null : fixedFor(g, config, null, fixedCache);
    return sim.backtest(g, draws, { strategy, config, tickets, tests, recent, halfLife, fixed, onProgress: progress });
  },

  // One or more past draws, each played "until it hits".
  // A result the filters would have thrown away cannot be hit with them: that draw is replayed
  // without filters and marked with the filters that removed it (excludedBy).
  untilHit({ game, draws, strategy, config, targets, maxAttempts, fixedCache, system }, progress) {
    const g = getGame(game);
    const fixed = strategy === 'random' ? null : fixedFor(g, config, null, fixedCache);
    const play = (index: number, i: number, strat: string): any => {
      const onProgress = (p: number, attempts: number) => progress((i + p) / targets.length, { target: i, attempts });
      return system
        ? sim.untilHitSystem(g, draws, { index, m: system, strategy: strat, config, fixed: strat === 'random' ? null : fixed, maxAttempts: Math.min(maxAttempts, 5e7), onProgress })
        : sim.untilHit(g, draws, { index, strategy: strat, config, maxAttempts, fixed: strat === 'random' ? null : fixed, onProgress });
    };
    const results = targets.map((index: number, i: number) => {
      let r = play(index, i, strategy);
      if (r.excluded) r = { ...play(index, i, 'random'), excludedBy: r.failed };
      progress((i + 1) / targets.length, { target: i, done: r });
      return r;
    });
    return { results };
  },
};

self.onmessage = ({ data: { id, task, params } }: MessageEvent<{ id: number; task: string; params: Params }>) => {
  let last = 0;
  const progress: Progress = (value, info) => {
    const now = Date.now();
    if (now - last < 150 && !info) return;
    last = now;
    self.postMessage({ id, progress: value, info });
  };
  fresh = null;
  try {
    const result = TASKS[task](params, progress);
    self.postMessage({ id, result, fixed: fresh });
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
  fresh = null;
};
