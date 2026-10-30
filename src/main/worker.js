// Background worker: everything that walks millions of combinations runs here, so the window
// never freezes. Messages: { id, task, params } in; { id, progress } and { id, result | error } out.
const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getGame, currentEra } = require('./engine/games');
const filters = require('./engine/filters');
const stats = require('./engine/stats');
const sim = require('./engine/simulate');
const popularity = require('./engine/popularity');
const { wheel } = require('./engine/wheel');
const { systemTable } = require('./engine/system');
const { tierOdds, combinationCount } = require('./engine/games');

// The census of the history-independent filters is reused while the settings stay the same.
// It is also saved as a file per filter set: one bit per combination (Lotto: 13 983 816 bits =
// 1.7 MB), so after a restart the exclusions are read instead of recomputed.
const cache = new Map();
function fixedFor(game, config, progress, cacheDir) {
  if (!config) return null;
  const fixedConfig = filters.splitConfig(config).fixed;
  const key = `${game.id}:${JSON.stringify(fixedConfig)}`;
  if (cache.has(key)) return cache.get(key);
  const hash = crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
  const file = cacheDir && path.join(cacheDir, `${game.id}-${hash}.bin`);
  let result = null;
  if (file) {
    try {
      const meta = JSON.parse(fs.readFileSync(`${file}.json`, 'utf8'));
      const allowed = new Uint8Array(fs.readFileSync(file));
      if (meta.key === key) result = { ...meta, allowed };
    } catch { /* not saved yet */ }
  }
  if (!result) {
    result = sim.fixedCensus(game, config, progress);
    if (file) {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(file, result.allowed);
      const { allowed, ...meta } = result;
      fs.writeFileSync(`${file}.json`, JSON.stringify({ ...meta, key, config: fixedConfig }));
    }
  }
  if (cache.size > 4) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
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

  // A Lotto system bet: numbers (given, or chosen to pass the filters best) and its prize table.
  system({ game, draws, m, numbers, strategy, config, recent, halfLife }) {
    const g = getGame(game);
    const pool = currentEra(g).pools[0];
    const chosen = numbers && numbers.length === m ? { numbers: [...numbers].sort((a, b) => a - b) } : sim.systemNumbers(g, draws, { m, strategy, config, recent, halfLife });
    const ctx = new filters.HistoryContext(pool, sim.eraDraws(g, draws).map((d) => d.pools[0]));
    const check = config ? filters.createChecker(pool, g.slipColumns, config, ctx) : () => 0;
    const bets = [];
    require('./engine/combinatorics').forEachCombination(m, pool.pick, (idx) => { const b = idx.map((i) => chosen.numbers[i - 1]); bets.push({ numbers: b, passes: !check(b) }); });
    return { numbers: chosen.numbers, table: systemTable(pool.size, pool.pick, m, tierOdds(g)), bets, price: g.price };
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

  generate({ game, draws, strategy, config, count, recent, halfLife, cacheDir, maxCommon }, progress) {
    const g = getGame(game);
    return sim.generate(g, draws, { strategy, config, count, recent, halfLife, maxCommon, fixed: strategy === 'random' ? null : fixedFor(g, config, progress, cacheDir) });
  },

  backtest({ game, draws, strategy, config, tickets, tests, recent, halfLife, cacheDir }, progress) {
    const g = getGame(game);
    const fixed = strategy === 'random' ? null : fixedFor(g, config, null, cacheDir);
    return sim.backtest(g, draws, { strategy, config, tickets, tests, recent, halfLife, fixed, onProgress: progress });
  },

  // One or more past draws, each played "until it hits".
  untilHit({ game, draws, strategy, config, targets, maxAttempts, recent, halfLife, cacheDir }, progress) {
    const g = getGame(game);
    const fixed = strategy === 'random' ? null : fixedFor(g, config, null, cacheDir);
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
