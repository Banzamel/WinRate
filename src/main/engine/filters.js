// Combination filters ("exclusions") for the main pool, and the exact census of all combinations.
//
// Every combination of the main pool is checked once (Lotto: 13 983 816, Eurojackpot: 2 118 760),
// so the share each filter removes is exact, not estimated. The same pass counts how all
// combinations are distributed over the pattern metrics (odd numbers, sum, runs...), which is
// what the history is compared with in the statistics: a filter only makes sense where real
// draws deviate from that distribution — and for a fair draw machine they do not.
const { binom, rank, forEachCombination } = require('./combinatorics');

// Pattern metrics of a sorted combination `a` (1-based numbers) in a pool of n, slip of `cols` columns.
const METRICS = ['odd', 'low', 'sum', 'maxRun', 'maxAP', 'maxDecade', 'maxEnding', 'maxRow', 'maxCol', 'spread'];

function createMeter(n, cols) {
  const mark = new Uint8Array(n + 2);
  const half = Math.floor(n / 2);
  // Group of every number (decade, last digit, slip row, slip column) looked up, not computed.
  const groups = [(x) => Math.floor(x / 10), (x) => x % 10, (x) => Math.floor((x - 1) / cols), (x) => (x - 1) % cols]
    .map((key) => Uint8Array.from({ length: n + 1 }, (_, x) => key(x)));
  const counts = groups.map((g) => new Uint8Array(Math.max(...g) + 1));
  // Fills `out` (array indexed like METRICS) and returns it.
  return function measure(a, out) {
    const k = a.length;
    let odd = 0; let low = 0; let sum = 0; let run = 1; let maxRun = 1;
    for (let i = 0; i < k; i++) {
      const x = a[i];
      odd += x & 1;
      if (x <= half) low++;
      sum += x;
      if (i > 0) { run = x === a[i - 1] + 1 ? run + 1 : 1; if (run > maxRun) maxRun = run; }
      mark[x] = 1;
    }
    // Longest arithmetic progression contained in the set (any common difference).
    let maxAP = k < 2 ? k : 2;
    for (let i = 0; i < k - 2; i++) {
      for (let j = i + 1; j < k - 1; j++) {
        const d = a[j] - a[i];
        if (a[i] + d * maxAP > n) break; // larger j only means a larger step
        let len = 2; let next = a[j] + d;
        while (next <= n && mark[next]) { len++; next += d; }
        if (len > maxAP) maxAP = len;
      }
    }
    for (let i = 0; i < k; i++) mark[a[i]] = 0;
    out[0] = odd; out[1] = low; out[2] = sum; out[3] = maxRun; out[4] = maxAP;
    for (let g = 0; g < 4; g++) {
      const table = groups[g]; const c = counts[g];
      let best = 0;
      for (let i = 0; i < k; i++) { const v = ++c[table[a[i]]]; if (v > best) best = v; }
      for (let i = 0; i < k; i++) c[table[a[i]]] = 0;
      out[5 + g] = best;
    }
    out[9] = a[k - 1] - a[0];
    return out;
  };
}

// Filter definitions. `kind`: range [min,max] on a metric, max / min on a metric,
// flag (on/off), or a history/weight threshold. A null config value switches the filter off.
const FILTERS = [
  { id: 'odd', kind: 'range', metric: 0 },
  { id: 'low', kind: 'range', metric: 1 },
  { id: 'sum', kind: 'range', metric: 2 },
  { id: 'maxRun', kind: 'max', metric: 3 },
  { id: 'maxAP', kind: 'max', metric: 4 },
  { id: 'maxDecade', kind: 'max', metric: 5 },
  { id: 'maxEnding', kind: 'max', metric: 6 },
  { id: 'maxRow', kind: 'max', metric: 7 },
  { id: 'maxCol', kind: 'max', metric: 8 },
  { id: 'minSpread', kind: 'min', metric: 9 },
  { id: 'birthdays', kind: 'flag' }, // every number 1..31 (dates): the most shared tickets
  { id: 'history', kind: 'history' }, // shares at least N numbers with a past draw
  { id: 'lastOverlap', kind: 'last' }, // at most N numbers from the previous draw
  { id: 'numberWeight', kind: 'weight' }, // average frequency z-score of the numbers below N
  { id: 'pairWeight', kind: 'pairs' }, // average pair co-occurrence z-score below N
];

// Suggested starting point: removes the shapes that rarely come out *and* that crowds of
// players pick (so a win is less often shared). Tuned to remove roughly 30 % of Lotto tickets.
function defaultFilters(pool) {
  const { size: n, pick: k } = pool;
  const mean = (k * (n + 1)) / 2;
  const sd = Math.sqrt((k * (n - k) * (n + 1)) / 12);
  return {
    odd: [1, k - 1],
    low: [1, k - 1],
    sum: [Math.round(mean - 1.5 * sd), Math.round(mean + 1.5 * sd)],
    maxRun: 2,
    maxAP: 3,
    maxDecade: 3,
    maxEnding: 2,
    maxRow: 3,
    maxCol: 3,
    minSpread: Math.round(n / 3),
    birthdays: true,
    history: k,
    lastOverlap: null,
    numberWeight: null,
    pairWeight: null,
  };
}

// History context for the history and weight filters: what was known after `draws`
// (main-pool numbers, oldest first). Draws can be added one by one (walk-forward simulation).
class HistoryContext {
  constructor(pool, draws = []) {
    const { size: n, pick: k } = pool;
    this.n = n; this.k = k; this.D = 0;
    this.exact = new Uint8Array(binom(n, k));
    this.near = new Uint8Array(binom(n, k - 1));
    this.counts = new Float64Array(n + 1);
    this.pairCounts = new Float64Array((n + 1) * (n + 1));
    this.last = new Uint8Array(n + 1);
    this.lastSeen = new Float64Array(n + 1).fill(-1);
    this.sub = new Array(k - 1);
    this.dirty = true;
    for (const nums of draws) this.add(nums);
  }

  add(nums) {
    const { k, n, sub } = this;
    this.exact[rank(nums)] = 1;
    for (let skip = 0; skip < k; skip++) {
      let j = 0;
      for (let i = 0; i < k; i++) if (i !== skip) sub[j++] = nums[i];
      this.near[rank(sub)] = 1;
    }
    this.last.fill(0);
    for (let i = 0; i < k; i++) {
      this.counts[nums[i]]++;
      this.last[nums[i]] = 1;
      this.lastSeen[nums[i]] = this.D;
      for (let j = i + 1; j < k; j++) this.pairCounts[nums[i] * (n + 1) + nums[j]]++;
    }
    this.D++;
    this.dirty = true;
  }

  // Frequency z-score of every number and of every pair (lazily recomputed after add()).
  scores() {
    if (!this.dirty) return this;
    const { n, k, D } = this;
    const pn = k / n;
    const sdNum = Math.sqrt(D * pn * (1 - pn)) || 1;
    this.numberZ = new Float64Array(n + 1);
    for (let x = 1; x <= n; x++) this.numberZ[x] = (this.counts[x] - D * pn) / sdNum;
    const ePair = (D * k * (k - 1)) / (n * (n - 1));
    const sdPair = Math.sqrt(ePair) || 1;
    this.pairZ = new Float64Array((n + 1) * (n + 1));
    for (let x = 1; x <= n; x++) for (let y = x + 1; y <= n; y++) this.pairZ[x * (n + 1) + y] = (this.pairCounts[x * (n + 1) + y] - ePair) / sdPair;
    this.dirty = false;
    return this;
  }
}

// Filters that depend on the history (the rest depend on the numbers only).
const HISTORY_KINDS = new Set(['history', 'last', 'weight', 'pairs']);
const splitConfig = (config) => {
  const fixed = { ...config }; const dynamic = {};
  for (const f of FILTERS) if (HISTORY_KINDS.has(f.kind)) { dynamic[f.id] = config[f.id]; fixed[f.id] = null; } else dynamic[f.id] = null;
  return { fixed, dynamic };
};

// Bitmask of the filters `a` fails (bit i = FILTERS[i]); 0 means the combination passes.
function createChecker(pool, cols, config, ctx) {
  const { size: n, pick: k } = pool;
  const measure = createMeter(n, cols);
  const m = new Array(METRICS.length);
  const sub = new Array(k - 1);
  const active = FILTERS.map((f) => config[f.id] !== null && config[f.id] !== undefined && config[f.id] !== false);
  const needsMetrics = FILTERS.some((f, i) => active[i] && f.metric !== undefined);
  const usesScores = FILTERS.some((f, i) => active[i] && (f.kind === 'weight' || f.kind === 'pairs'));
  if (ctx && usesScores) ctx.scores();
  return function check(a) {
    let mask = 0;
    if (needsMetrics) measure(a, m);
    for (let i = 0; i < FILTERS.length; i++) {
      if (!active[i]) continue;
      const f = FILTERS[i];
      const v = config[f.id];
      let fail = false;
      switch (f.kind) {
        case 'range': fail = m[f.metric] < v[0] || m[f.metric] > v[1]; break;
        case 'max': fail = m[f.metric] > v; break;
        case 'min': fail = m[f.metric] < v; break;
        case 'flag': fail = a[k - 1] <= 31; break;
        case 'history': {
          if (!ctx || !ctx.D) break;
          if (v <= k && ctx.exact[rank(a)]) { fail = true; break; }
          if (v <= k - 1) {
            for (let skip = 0; skip < k && !fail; skip++) {
              let j = 0;
              for (let t = 0; t < k; t++) if (t !== skip) sub[j++] = a[t];
              if (ctx.near[rank(sub)]) fail = true;
            }
          }
          break;
        }
        case 'last': {
          if (!ctx || !ctx.D) break;
          let shared = 0;
          for (let t = 0; t < k; t++) shared += ctx.last[a[t]];
          fail = shared > v;
          break;
        }
        case 'weight': {
          if (!ctx || !ctx.D) break;
          let s = 0;
          for (let t = 0; t < k; t++) s += ctx.numberZ[a[t]];
          fail = s / k < v;
          break;
        }
        case 'pairs': {
          if (!ctx || !ctx.D) break;
          let s = 0;
          for (let t = 0; t < k; t++) for (let u = t + 1; u < k; u++) s += ctx.pairZ[a[t] * (n + 1) + a[u]];
          fail = s / ((k * (k - 1)) / 2) < v;
          break;
        }
        default:
      }
      if (fail) mask |= 1 << i;
    }
    return mask;
  };
}

// Exact census of a filter set: walks every combination of the pool once.
// Returns the bitset of allowed ranks, how many combinations each filter removes on its own
// (overlaps counted in each) and how many the whole set removes.
function census(pool, cols, config, ctx, { onProgress } = {}) {
  const { size: n, pick: k } = pool;
  const total = binom(n, k);
  const allowed = new Uint8Array(Math.ceil(total / 8));
  const check = createChecker(pool, cols, config, ctx);
  const removed = new Float64Array(FILTERS.length);
  let allowedCount = 0;
  let r = 0;
  forEachCombination(n, k, (a) => {
    let mask = check(a);
    if (mask === 0) { allowed[r >> 3] |= 1 << (r & 7); allowedCount++; }
    while (mask) { const i = 31 - Math.clz32(mask); removed[i]++; mask &= ~(1 << i); }
    r++;
    if (onProgress && (r & 0xfffff) === 0) onProgress(r / total);
  });
  return {
    total, allowed, allowedCount,
    filters: FILTERS.map((f, i) => ({ id: f.id, removed: removed[i], share: removed[i] / total })),
  };
}

// Distribution of every pattern metric over all combinations (what a fair draw produces).
// It depends on the pool only, so the app computes it once and caches it.
function distributions(pool, cols, { onProgress } = {}) {
  const { size: n, pick: k } = pool;
  const total = binom(n, k);
  const measure = createMeter(n, cols);
  const m = new Array(METRICS.length);
  const dist = METRICS.map(() => new Float64Array(n * k + 1));
  let r = 0;
  forEachCombination(n, k, (a) => {
    measure(a, m);
    for (let i = 0; i < METRICS.length; i++) dist[i][m[i]]++;
    r++;
    if (onProgress && (r & 0xfffff) === 0) onProgress(r / total);
  });
  return { total, metrics: trimDistributions(dist) };
}

function trimDistributions(dist) {
  const out = {};
  METRICS.forEach((id, i) => {
    const arr = Array.from(dist[i]);
    let lo = 0; let hi = arr.length - 1;
    while (lo < hi && !arr[lo]) lo++;
    while (hi > lo && !arr[hi]) hi--;
    out[id] = { from: lo, counts: arr.slice(lo, hi + 1) };
  });
  return out;
}

const isAllowed = (allowed, r) => (allowed[r >> 3] >> (r & 7)) & 1;

// How the real draws would have fared: each draw is checked with the history known *before* it.
// Returns per filter the number of draws it would have removed, and how many survived them all.
function historySurvival(pool, cols, config, draws) {
  const removed = new Array(FILTERS.length).fill(0);
  let survived = 0;
  const ctx = new HistoryContext(pool);
  const active = Object.values(splitConfig(config).dynamic).some((v) => v !== null && v !== undefined && v !== false);
  let check = createChecker(pool, cols, config, ctx);
  for (const d of draws) {
    if (active) check = createChecker(pool, cols, config, ctx);
    const mask = check(d.pools[0]);
    if (!mask) survived++;
    for (let i = 0; i < FILTERS.length; i++) if (mask & (1 << i)) removed[i]++;
    ctx.add(d.pools[0]);
  }
  return { draws: draws.length, survived, removed: FILTERS.map((f, i) => ({ id: f.id, count: removed[i], share: draws.length ? removed[i] / draws.length : 0 })) };
}

module.exports = { METRICS, FILTERS, createMeter, defaultFilters, HistoryContext, splitConfig, createChecker, census, distributions, historySurvival, isAllowed };
