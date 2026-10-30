// Ticket generation and the scientific simulations:
//   generate()  — tickets for the next draw with a strategy and the active filters;
//   backtest()  — walk-forward test: for each past draw only the earlier draws are known, the
//                 strategy plays K tickets and they are scored against the real result, next to a
//                 plain random player with the same number of tickets;
//   untilHit()  — keeps drawing tickets (never the same one twice) for a past draw (whose result it knows) until one
//                 matches it, and counts the attempts — the honest price of "drawing until it hits".
const { binom, rank, unrank } = require('./combinatorics');
const { currentEra, tierFor } = require('./games');
const { FILTERS, HistoryContext, splitConfig, createChecker, census, isAllowed } = require('./filters');
const { posterior } = require('./bias');
const { createScorer } = require('./popularity');

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

const STRATEGIES = ['random', 'filtered', 'bayes', 'unpopular', 'hot', 'cold', 'overdue', 'frequent', 'pairs'];
// Candidates per ticket of the "unpopular" strategy (the least popular one is kept).
const UNPOPULAR_CANDIDATES = 12;

// Per-number weights of a strategy for one pool, from the history known so far.
// recent: window (draws) of the hot/cold strategies.
function numberWeights(strategy, size, pick, draws, recent = 50, halfLife = 0) {
  const w = new Float64Array(size + 1);
  if (strategy === 'bayes') {
    // Estimated physical chance of each ball (empirical Bayes; equal for a fair machine).
    const post = posterior(size, pick, draws, { halfLife });
    for (const x of post.numbers) w[x.n] = x.p;
    return w;
  }
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
function createPlayer(game, { strategy, config, fixed, ctx, draws, rng, recent, halfLife }) {
  const era = currentEra(game);
  const pools = era.pools;
  const main = pools[0];
  const total = binom(main.size, main.pick);
  const useFilters = strategy !== 'random' && config;
  const { dynamic } = useFilters ? splitConfig(config) : { dynamic: null };
  const dynamicActive = dynamic && Object.values(dynamic).some((v) => v !== null && v !== undefined && v !== false);
  const checkDynamic = dynamicActive ? createChecker(main, game.slipColumns, dynamic, ctx) : null;
  const uniform = strategy === 'random' || strategy === 'filtered' || strategy === 'unpopular';
  const weights = pools.map((p, i) => (uniform ? null : numberWeights(strategy, p.size, p.pick, draws.map((d) => d.pools[i]), recent, halfLife)));
  const popularity = strategy === 'unpopular' ? createScorer(main, game.slipColumns, draws.length ? draws[draws.length - 1].pools[0] : []) : null;
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
      let r = nextMain();
      if (r < 0) return null;
      if (popularity) {
        // Keep the least popular of several valid candidates: same chance, fewer people to share with.
        let best = popularity(unrank(r, main.pick));
        for (let i = 1; i < UNPOPULAR_CANDIDATES; i++) {
          const c = nextMain();
          if (c < 0) break;
          const s = popularity(unrank(c, main.pick));
          if (s < best) { best = s; r = c; }
        }
      }
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
// maxCommon: at most this many main numbers shared by any two tickets of the set (spreads a coupon
// over different numbers instead of near-copies); null = no limit.
function generate(game, draws, { strategy = 'filtered', config, count = 5, seed, recent = 50, halfLife = 0, fixed, maxCommon = null } = {}) {
  const era = eraDraws(game, draws);
  const ctx = new HistoryContext(currentEra(game).pools[0], era.map((d) => d.pools[0]));
  const player = createPlayer(game, { strategy, config, fixed: fixed || (strategy !== 'random' ? fixedCensus(game, config) : null), ctx, draws: era, rng: createRng(seed), recent, halfLife });
  const seen = new Set(); const tickets = [];
  for (let i = 0; i < count * 2000 && tickets.length < count; i++) {
    const t = player.next();
    if (!t) break;
    const key = t.ranks.join(':');
    if (seen.has(key)) continue;
    if (maxCommon !== null && tickets.some((tk) => tk[0].filter((x) => t.pools[0].includes(x)).length > maxCommon)) continue;
    seen.add(key); tickets.push(t.pools);
  }
  const score = createScorer(currentEra(game).pools[0], game.slipColumns, era.length ? era[era.length - 1].pools[0] : []);
  return { tickets, popularity: tickets.map((tk) => score(tk[0])) };
}

// Walk-forward backtest over the last `tests` draws.
function backtest(game, draws, { strategy = 'filtered', config, tickets = 10, tests = 100, seed, recent = 50, halfLife = 0, fixed, onProgress } = {}) {
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
    const player = createPlayer(game, { strategy, config, fixed: fixedSet, ctx, draws: known, rng, recent, halfLife });
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

// Draws `pick` different numbers of 1..n one at a time (each from the numbers still left, like a
// draw machine), sorted into `out`. `bag` is a permutation of 1..n kept between calls.
function drawNumbers(rng, bag, pick, out) {
  const n = bag.length;
  for (let i = 0; i < pick; i++) {
    const j = i + rng.int(n - i);
    const x = bag[j]; bag[j] = bag[i]; bag[i] = x;
    out[i] = x;
  }
  for (let i = 1; i < pick; i++) { const x = out[i]; let j = i - 1; while (j >= 0 && out[j] > x) { out[j + 1] = out[j]; j--; } out[j + 1] = x; }
  return out;
}
const newBag = (n) => Array.from({ length: n }, (_, i) => i + 1);
const testBit = (bits, i) => (bits[i >>> 3] >> (i & 7)) & 1;
const setBit = (bits, i) => { bits[i >>> 3] |= 1 << (i & 7); };

// The filters a past result breaks (with the history known before it), or [] when it passes.
function failedFilters(game, config, ctx, numbers) {
  const mask = createChecker(currentEra(game).pools[0], game.slipColumns, config, ctx)(numbers);
  return FILTERS.filter((f, i) => mask & (1 << i)).map((f) => f.id);
}

// The dynamic (history) filters of a config as one checker, or null when none is on.
function dynamicChecker(game, config, ctx) {
  const { dynamic } = splitConfig(config);
  const on = Object.values(dynamic).some((v) => v !== null && v !== undefined && v !== false);
  return on ? createChecker(currentEra(game).pools[0], game.slipColumns, dynamic, ctx) : null;
}

// "Until it hits" for a past draw `index` (only the draws before it are known): tickets are drawn
// number by number; one that breaks the filters or was already played is not played. Every played
// ticket is remembered, so none is played twice, and the search goes on until one is the result.
function untilHit(game, draws, { index, strategy = 'filtered', config, maxAttempts = 2e8, seed, fixed, onProgress, shouldStop } = {}) {
  const era = eraDraws(game, draws);
  if (index < 0) index += era.length;
  const target = era[index];
  if (!target) throw new Error('no such draw');
  const pools = currentEra(game).pools;
  const main = pools[0];
  const known = era.slice(0, index);
  const ctx = new HistoryContext(main, known.map((d) => d.pools[0]));
  const useFilters = strategy !== 'random' && config;
  const base = { date: target.date, numbers: target.pools, strategy, combinations: pools.reduce((n, p) => n * binom(p.size, p.pick), 1) };
  if (useFilters) {
    const failed = failedFilters(game, config, ctx, target.pools[0]);
    if (failed.length) return { ...base, excluded: true, failed, attempts: 0 };
  }
  const fixedSet = useFilters ? fixed || fixedCensus(game, config) : null;
  const checkDynamic = useFilters ? dynamicChecker(game, config, ctx) : null;
  // A ticket is one number: main rank, then the rank of every extra pool (Eurojackpot: Euro numbers).
  const radix = pools.map((p) => binom(p.size, p.pick));
  const played = new Uint8Array(Math.ceil(base.combinations / 8));
  const targetKey = target.pools.reduce((key, nums, i) => key * radix[i] + rank(nums), 0);
  const allowed = (fixedSet ? fixedSet.allowedCount : radix[0]) * radix.slice(1).reduce((a, b) => a * b, 1);
  const rng = createRng(seed);
  const bags = pools.map((p) => newBag(p.size));
  const bufs = pools.map((p) => new Array(p.pick));
  const started = Date.now();
  let attempts = 0; let rejected = 0; let repeats = 0; let tries = 0;
  const result = (extra) => ({ ...base, attempts, rejected, repeats, expectedUniform: (allowed + 1) / 2, ms: Date.now() - started, ...extra });
  for (;;) {
    tries++;
    if ((tries & 0xfffff) === 0) {
      if (onProgress) onProgress(Math.min(1, attempts / Math.min(maxAttempts, allowed)), attempts);
      if (shouldStop && shouldStop()) return result({ hit: false, stopped: true });
    }
    const nums = drawNumbers(rng, bags[0], main.pick, bufs[0]);
    const r = rank(nums);
    if (fixedSet && !isAllowed(fixedSet.allowed, r)) { rejected++; continue; }
    if (checkDynamic && checkDynamic(nums)) { rejected++; continue; }
    let key = r;
    for (let i = 1; i < pools.length; i++) key = key * radix[i] + rank(drawNumbers(rng, bags[i], pools[i].pick, bufs[i]));
    if (testBit(played, key)) { repeats++; continue; }
    setBit(played, key);
    attempts++;
    if (key === targetKey) return result({ hit: true });
    if (attempts >= maxAttempts) return result({ hit: false });
    if (attempts >= allowed) return result({ hit: false, gaveUp: true });
  }
}

module.exports = { STRATEGIES, createRng, numberWeights, weightedPick, createPlayer, hitsOf, eraDraws, fixedCensus, generate, backtest, untilHit };

// Numbers for a system bet of m numbers whose C(m, 6) bets all pass the filters, if such numbers
// exist: random m-sets weighted like the strategy are improved by swapping one number at a time
// (hill climbing with restarts) until every bet passes. Returns the best set found and its share.
function systemNumbers(game, draws, { m, strategy = 'filtered', config, seed, restarts = 60, recent = 50, halfLife = 0, timeLimit = 8000 } = {}) {
  const deadline = Date.now() + timeLimit;
  const era = eraDraws(game, draws);
  const pool = currentEra(game).pools[0];
  const ctx = new HistoryContext(pool, era.map((d) => d.pools[0]));
  const check = config ? createChecker(pool, game.slipColumns, config, ctx) : () => 0;
  const rng = createRng(seed);
  const weights = numberWeights(['random', 'filtered', 'unpopular'].includes(strategy) ? 'random' : strategy, pool.size, pool.pick, era.map((d) => d.pools[0]), recent, halfLife);
  const { forEachCombination } = require('./combinatorics');
  const total = binom(m, pool.pick);
  const sub = new Array(pool.pick);
  const passing = (nums) => {
    let pass = 0;
    forEachCombination(m, pool.pick, (idx) => { for (let i = 0; i < pool.pick; i++) sub[i] = nums[idx[i] - 1]; if (!check(sub)) pass++; });
    return pass;
  };
  let best = null;
  for (let r = 0; r < restarts; r++) {
    let nums = weightedPick(rng, weights, pool.size, m, null, new Array(m)).slice();
    let score = passing(nums);
    for (let improved = true; improved && score < total && Date.now() < deadline;) {
      improved = false;
      // Try every single swap; take the first one that helps (positions and numbers in random order).
      const order = Array.from({ length: m }, (_, i) => i).sort(() => rng.next() - 0.5);
      for (const i of order) {
        const start = 1 + rng.int(pool.size);
        for (let s2 = 0; s2 < pool.size && !improved; s2++) {
          const x = ((start + s2 - 1) % pool.size) + 1;
          if (nums.includes(x)) continue;
          const next = nums.slice(); next[i] = x; next.sort((p, q) => p - q);
          const sc = passing(next);
          if (sc > score) { nums = next; score = sc; improved = true; }
        }
        if (improved) break;
      }
    }
    if (!best || score > best.pass) best = { numbers: nums, pass: score, total };
    if (score === total || Date.now() >= deadline) break;
  }
  return { ...best, share: best.pass / best.total };
}

module.exports.systemNumbers = systemNumbers;

// "Until it hits" with system bets of m numbers: the m numbers are drawn one by one; of their
// C(m, 6) bets only the ones that pass the filters and were not played before are played (and
// remembered). A system with no such bet is not played. Ends when a played bet is the result.
function untilHitSystem(game, draws, { index, m, strategy = 'filtered', config, maxAttempts = 2e7, seed, fixed, onProgress } = {}) {
  const era = eraDraws(game, draws);
  if (index < 0) index += era.length;
  const target = era[index];
  if (!target) throw new Error('no such draw');
  const pool = currentEra(game).pools[0];
  const known = era.slice(0, index);
  const ctx = new HistoryContext(pool, known.map((d) => d.pools[0]));
  const useFilters = strategy !== 'random' && config;
  const base = { date: target.date, numbers: target.pools, strategy, system: m, combinations: binom(pool.size, pool.pick) };
  if (useFilters) {
    const failed = failedFilters(game, config, ctx, target.pools[0]);
    if (failed.length) return { ...base, excluded: true, failed, attempts: 0, bets: 0 };
  }
  const fixedSet = useFilters ? fixed || fixedCensus(game, config) : null;
  const checkDynamic = useFilters ? dynamicChecker(game, config, ctx) : null;
  const { forEachCombination } = require('./combinatorics');
  const played = new Uint8Array(Math.ceil(base.combinations / 8));
  const targetRank = rank(target.pools[0]);
  const allowed = fixedSet ? fixedSet.allowedCount : base.combinations;
  const rng = createRng(seed);
  const bag = newBag(pool.size);
  const nums = new Array(m); const sub = new Array(pool.pick);
  const started = Date.now();
  let attempts = 0; let bets = 0; let skipped = 0; let tries = 0;
  // Expected systems: half of the allowed bets, at the bets per system played so far.
  const result = (extra) => ({ ...base, attempts, bets, skipped, expectedAttempts: attempts ? ((allowed + 1) / 2) / (bets / attempts) : 0, ms: Date.now() - started, ...extra });
  for (;;) {
    tries++;
    if (onProgress && (tries & 0x3fff) === 0) onProgress(Math.min(1, attempts / maxAttempts), attempts);
    drawNumbers(rng, bag, m, nums);
    let fresh = 0; let hit = false;
    forEachCombination(m, pool.pick, (idx) => {
      for (let i = 0; i < pool.pick; i++) sub[i] = nums[idx[i] - 1];
      const r = rank(sub);
      if (testBit(played, r)) return;
      if (fixedSet && !isAllowed(fixedSet.allowed, r)) return;
      if (checkDynamic && checkDynamic(sub)) return;
      setBit(played, r);
      fresh++;
      if (r === targetRank) hit = true;
    });
    if (!fresh) { skipped++; continue; }
    attempts++; bets += fresh;
    if (hit) return result({ hit: true });
    if (attempts >= maxAttempts) return result({ hit: false });
    if (bets >= allowed) return result({ hit: false, gaveUp: true });
  }
}

module.exports.untilHitSystem = untilHitSystem;

