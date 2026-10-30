// Ticket generation and the scientific simulations:
//   generate()  — tickets for the next draw with a strategy and the active filters;
//   backtest()  — walk-forward test: for each past draw only the earlier draws are known, the
//                 strategy plays K tickets and they are scored against the real result, next to a
//                 plain random player with the same number of tickets;
//   untilHit()  — keeps generating tickets for a past draw (whose result it knows) until one
//                 matches it, and counts the attempts — the honest price of "drawing until it hits".
const { binom, rank, unrank } = require('./combinatorics');
const { currentEra, tierFor } = require('./games');
const { FILTERS, HistoryContext, splitConfig, createChecker, census, isAllowed } = require('./filters');

// xoshiro128** — fast and seedable; without a seed the state comes from crypto.
function createRng(seed) {
  let s;
  if (seed === undefined || seed === null) {
    const b = require('crypto').randomBytes(16);
    s = [0, 4, 8, 12].map((o) => b.readUInt32LE(o));
  } else {
    let x = seed >>> 0; // splitmix32 spreads a numeric seed over the four state words
    s = [0, 0, 0, 0].map(() => {
      x = (x + 0x9e3779b9) >>> 0;
      let z = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    });
  }
  let [a, b, c, d] = s;
  if (!(a | b | c | d)) a = 1;
  const next = () => {
    const m = Math.imul(b, 5);
    const r = Math.imul((m << 7) | (m >>> 25), 9);
    const t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = (d << 11) | (d >>> 21);
    return (r >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n) };
}

const STRATEGIES = ['random', 'filtered', 'hot', 'cold', 'overdue', 'frequent', 'pairs'];

// Per-number weights of a strategy for one pool, from the history known so far.
// recent: window (draws) of the hot/cold strategies.
function numberWeights(strategy, size, pick, draws, recent = 50) {
  const w = new Float64Array(size + 1);
  const count = new Float64Array(size + 1);
  const recentCount = new Float64Array(size + 1);
  const lastSeen = new Float64Array(size + 1).fill(-1);
  draws.forEach((nums, t) => {
    for (const x of nums) { count[x]++; lastSeen[x] = t; if (t >= draws.length - recent) recentCount[x]++; }
  });
  for (let x = 1; x <= size; x++) {
    switch (strategy) {
      case 'hot': w[x] = recentCount[x] + 1; break;
      case 'cold': w[x] = 1 / (recentCount[x] + 1); break;
      case 'overdue': w[x] = (lastSeen[x] < 0 ? draws.length : draws.length - 1 - lastSeen[x]) + 1; break;
      case 'frequent': case 'pairs': w[x] = count[x] + 1; break;
      default: w[x] = 1;
    }
  }
  return w;
}

// Draws `pick` distinct numbers with probability proportional to the weights.
// affinity (optional): extra weight of y once x is chosen, affinity(x, y) > 0.
function weightedPick(rng, weights, size, pick, affinity, out = new Array(pick)) {
  const w = Float64Array.from(weights);
  for (let i = 0; i < pick; i++) {
    let total = 0;
    for (let x = 1; x <= size; x++) total += w[x];
    let r = rng.next() * total; let x = 1;
    for (; x < size; x++) { r -= w[x]; if (r < 0) break; }
    while (w[x] === 0) x--; // rounding at the very end of the range
    out[i] = x;
    w[x] = 0;
    if (affinity) for (let y = 1; y <= size; y++) if (w[y]) w[y] *= affinity(x, y);
  }
  return out.sort((a, b) => a - b);
}

// A ticket source for one game: next() returns { pools, ranks } or null after too many rejections.
// fixed: census of the history-independent filters (bitset), shared between draws;
// ctx: HistoryContext for the history filters and the pair strategy.
function createPlayer(game, { strategy, config, fixed, ctx, draws, rng, recent }) {
  const era = currentEra(game);
  const pools = era.pools;
  const main = pools[0];
  const total = binom(main.size, main.pick);
  const useFilters = strategy !== 'random' && config;
  const { dynamic } = useFilters ? splitConfig(config) : { dynamic: null };
  const dynamicActive = dynamic && Object.values(dynamic).some((v) => v !== null && v !== undefined && v !== false);
  const checkDynamic = dynamicActive ? createChecker(main, game.slipColumns, dynamic, ctx) : null;
  const uniform = strategy === 'random' || strategy === 'filtered';
  const weights = pools.map((p, i) => (uniform ? null : numberWeights(strategy, p.size, p.pick, draws.map((d) => d.pools[i]), recent)));
  let affinity = null;
  if (strategy === 'pairs' && ctx) {
    ctx.scores();
    const w = main.size + 1;
    // A pair that came out more often than expected gets up to ~2x the weight, a rare one less.
    affinity = (x, y) => Math.exp(0.35 * Math.max(-2, Math.min(2, x < y ? ctx.pairZ[x * w + y] : ctx.pairZ[y * w + x])));
  }
  const buf = pools.map((p) => new Array(p.pick));
  const mainNumbers = new Array(main.pick);

  // Main pool: a rank (and its numbers) that passes the filters.
  function nextMain() {
    for (let tries = 0; tries < 1e6; tries++) {
      let r;
      if (uniform) r = rng.int(total);
      else r = rank(weightedPick(rng, weights[0], main.size, main.pick, affinity, mainNumbers));
      if (useFilters && fixed && !isAllowed(fixed.allowed, r)) continue;
      if (checkDynamic && checkDynamic(unrank(r, main.pick))) continue;
      return r;
    }
    return -1;
  }
  return {
    total,
    // Fast path for untilHit: only the ranks.
    nextRanks() {
      const r = nextMain();
      if (r < 0) return null;
      const ranks = [r];
      for (let i = 1; i < pools.length; i++) {
        const p = pools[i];
        ranks.push(weights[i] ? rank(weightedPick(rng, weights[i], p.size, p.pick, null, buf[i])) : rng.int(binom(p.size, p.pick)));
      }
      return ranks;
    },
    next() {
      const ranks = this.nextRanks();
      return ranks && { ranks, pools: ranks.map((r, i) => unrank(r, pools[i].pick)) };
    },
  };
}

// Matches of a ticket against a draw, per pool.
const hitsOf = (ticket, draw) => ticket.map((nums, i) => nums.filter((x) => draw[i].includes(x)).length);

// Draws played under the current rules (the pool sizes of the strategies must match).
const eraDraws = (game, draws) => draws.filter((d) => d.date >= currentEra(game).from);

function fixedCensus(game, config, onProgress) {
  if (!config) return null;
  const { fixed } = splitConfig(config);
  return census(currentEra(game).pools[0], game.slipColumns, fixed, null, { onProgress });
}

// Tickets for the next draw.
function generate(game, draws, { strategy = 'filtered', config, count = 5, seed, recent = 50, fixed } = {}) {
  const era = eraDraws(game, draws);
  const ctx = new HistoryContext(currentEra(game).pools[0], era.map((d) => d.pools[0]));
  const player = createPlayer(game, { strategy, config, fixed: fixed || (strategy !== 'random' ? fixedCensus(game, config) : null), ctx, draws: era, rng: createRng(seed), recent });
  const seen = new Set(); const tickets = [];
  for (let i = 0; i < count * 50 && tickets.length < count; i++) {
    const t = player.next();
    if (!t) break;
    const key = t.ranks.join(':');
    if (seen.has(key)) continue;
    seen.add(key); tickets.push(t.pools);
  }
  return { tickets };
}

// Walk-forward backtest over the last `tests` draws.
function backtest(game, draws, { strategy = 'filtered', config, tickets = 10, tests = 100, seed, recent = 50, fixed, onProgress } = {}) {
  const era = eraDraws(game, draws);
  const main = currentEra(game).pools[0];
  const start = Math.max(1, era.length - tests);
  const ctx = new HistoryContext(main, era.slice(0, start).map((d) => d.pools[0]));
  const rng = createRng(seed);
  const fixedSet = strategy !== 'random' ? fixed || fixedCensus(game, config) : null;
  const tierIds = game.tiers.map((t) => t.id);
  const tally = () => ({ tiers: Object.fromEntries(tierIds.map((id) => [id, 0])), any: 0, bestHits: {}, prize: 0 });
  const result = { strategy: tally(), random: tally(), draws: 0, survived: 0, tickets, from: era[start] && era[start].date, to: era.length ? era[era.length - 1].date : null };
  // Would the filters have kept the winning ticket of this draw?
  const dynamic = config && strategy !== 'random' ? splitConfig(config).dynamic : null;
  const survives = (nums) => !dynamic || ((!fixedSet || isAllowed(fixedSet.allowed, rank(nums))) && createChecker(main, game.slipColumns, dynamic, ctx)(nums) === 0);
  const score = (bucket, ticket, draw) => {
    const hits = hitsOf(ticket, draw.pools);
    const tier = tierFor(game, hits);
    const key = hits.join('+');
    bucket.bestHits[key] = (bucket.bestHits[key] || 0) + 1;
    if (tier) { bucket.tiers[tier.id]++; bucket.any++; if (tier.fixed) bucket.prize += tier.fixed; }
  };
  for (let t = start; t < era.length; t++) {
    const known = era.slice(0, t);
    const draw = era[t];
    const player = createPlayer(game, { strategy, config, fixed: fixedSet, ctx, draws: known, rng, recent });
    const randomPlayer = createPlayer(game, { strategy: 'random', ctx, draws: known, rng });
    for (let i = 0; i < tickets; i++) {
      const a = player.next(); if (a) score(result.strategy, a.pools, draw);
      score(result.random, randomPlayer.next().pools, draw);
    }
    if (survives(draw.pools[0])) result.survived++;
    result.draws++;
    ctx.add(draw.pools[0]);
    if (onProgress) onProgress((t - start + 1) / (era.length - start));
  }
  return result;
}

// Draws tickets for the past draw `index` (into the current-era list) until one matches it fully.
function untilHit(game, draws, { index, strategy = 'filtered', config, maxAttempts = 2e8, seed, recent = 50, fixed, onProgress, shouldStop } = {}) {
  const era = eraDraws(game, draws);
  if (index < 0) index += era.length;
  const target = era[index];
  if (!target) throw new Error('no such draw');
  const pools = currentEra(game).pools;
  const main = pools[0];
  const known = era.slice(0, index);
  const ctx = new HistoryContext(main, known.map((d) => d.pools[0]));
  const fixedSet = strategy !== 'random' ? fixed || fixedCensus(game, config) : null;
  const targetRanks = target.pools.map((nums) => rank(nums));
  const base = { date: target.date, numbers: target.pools, strategy, combinations: pools.reduce((n, p) => n * binom(p.size, p.pick), 1) };
  // Would the filters have thrown the winning ticket away? Then no amount of drawing can hit it.
  if (strategy !== 'random' && config) {
    const failed = [];
    if (fixedSet && !isAllowed(fixedSet.allowed, targetRanks[0])) {
      const { fixed: f } = splitConfig(config);
      const mask = createChecker(main, game.slipColumns, f, null)(target.pools[0]);
      FILTERS.forEach((flt, i) => { if (mask & (1 << i)) failed.push(flt.id); });
    }
    const mask = createChecker(main, game.slipColumns, splitConfig(config).dynamic, ctx)(target.pools[0]);
    FILTERS.forEach((flt, i) => { if (mask & (1 << i)) failed.push(flt.id); });
    if (failed.length) return { ...base, excluded: true, failed, attempts: 0 };
  }
  const player = createPlayer(game, { strategy, config, fixed: fixedSet, ctx, draws: known, rng: createRng(seed), recent });
  const allowedMain = strategy === 'random' || !fixedSet ? binom(main.size, main.pick) : fixedSet.allowedCount;
  const expectedUniform = pools.slice(1).reduce((n, p) => n * binom(p.size, p.pick), allowedMain);
  const started = Date.now();
  let attempts = 0;
  const near = new Array(pools.length).fill(0); // tickets that got the main pool right
  for (;;) {
    const ranks = player.nextRanks();
    if (!ranks) return { ...base, attempts, hit: false, gaveUp: true, expectedUniform, ms: Date.now() - started };
    attempts++;
    let all = true;
    for (let i = 0; i < ranks.length; i++) if (ranks[i] !== targetRanks[i]) { all = false; } else near[i]++;
    if (all) return { ...base, attempts, hit: true, expectedUniform, mainHits: near[0], ms: Date.now() - started };
    if (attempts >= maxAttempts) return { ...base, attempts, hit: false, expectedUniform, mainHits: near[0], ms: Date.now() - started };
    if ((attempts & 0xfffff) === 0) {
      if (onProgress) onProgress(attempts / maxAttempts, attempts);
      if (shouldStop && shouldStop()) return { ...base, attempts, hit: false, stopped: true, expectedUniform, mainHits: near[0], ms: Date.now() - started };
    }
  }
}

module.exports = { STRATEGIES, createRng, numberWeights, weightedPick, createPlayer, hitsOf, eraDraws, fixedCensus, generate, backtest, untilHit };
