// Background worker: everything that walks millions of combinations runs here, so the window
// never freezes. Messages: { id, task, params } in; { id, progress } and { id, result | error } out.
const { parentPort } = require('worker_threads');
const { getGame, currentEra } = require('./engine/games');
const filters = require('./engine/filters');
const stats = require('./engine/stats');
const sim = require('./engine/simulate');
const popularity = require('./engine/popularity');
const { wheel } = require('./engine/wheel');
const { tierOdds, combinationCount } = require('./engine/games');

// The census of the history-independent filters is reused while the settings stay the same.
const cache = new Map();
function fixedFor(game, config, progress) {
  if (!config) return null;
  const key = `${game.id}:${JSON.stringify(filters.splitConfig(config).fixed)}`;
  if (!cache.has(key)) {
    if (cache.size > 4) cache.delete(cache.keys().next().value);
    cache.set(key, sim.fixedCensus(game, config, progress));
  }
  return cache.get(key);
}

const TASKS = {
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
      ticket: ticket ? { popularity: pop, ...popularity.expectedValue(info, { jackpot, sold, prizes, popularity: pop }) } : null,
    };
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
    const ctx = new filters.HistoryContext(pool, era.map((d) => d.pools[0]));
    const all = filters.census(pool, g.slipColumns, config, ctx, { onProgress: progress });
    const survival = filters.historySurvival(pool, g.slipColumns, config, era);
    return { total: all.total, allowedCount: all.allowedCount, filters: all.filters, survival };
  },

  generate({ game, draws, strategy, config, count, recent, halfLife }, progress) {
    const g = getGame(game);
    return sim.generate(g, draws, { strategy, config, count, recent, halfLife, fixed: strategy === 'random' ? null : fixedFor(g, config, progress) });
  },

  backtest({ game, draws, strategy, config, tickets, tests, recent, halfLife }, progress) {
    const g = getGame(game);
    const fixed = strategy === 'random' ? null : fixedFor(g, config);
    return sim.backtest(g, draws, { strategy, config, tickets, tests, recent, halfLife, fixed, onProgress: progress });
  },

  // One or more past draws, each played "until it hits".
  untilHit({ game, draws, strategy, config, targets, maxAttempts, recent, halfLife }, progress) {
    const g = getGame(game);
    const fixed = strategy === 'random' ? null : fixedFor(g, config);
    const results = [];
    targets.forEach((index, i) => {
      results.push(sim.untilHit(g, draws, {
        index, strategy, config, maxAttempts, recent, halfLife, fixed,
        onProgress: (p, attempts) => progress((i + p) / targets.length, { target: i, attempts }),
      }));
      progress((i + 1) / targets.length, { target: i, done: results[i] });
    });
    return { results };
  },
};

parentPort.on('message', ({ id, task, params }) => {
  let last = 0;
  const progress = (value, info) => {
    const now = Date.now();
    if (now - last < 150 && !info) return;
    last = now;
    parentPort.postMessage({ id, progress: value, info });
  };
  try {
    parentPort.postMessage({ id, result: TASKS[task](params, progress) });
  } catch (e) {
    parentPort.postMessage({ id, error: e.message });
  }
});
