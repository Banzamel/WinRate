// Statistics of the draw history: frequencies, gaps, hot and cold numbers, pairs, patterns —
// each compared with what a fair draw would give, with a chi-square test saying whether the
// difference is larger than chance.
const { binom, matchProbability } = require('./combinatorics');
const { METRICS, createMeter } = require('./filters');
const bias = require('./bias');

// ln Γ(x) (Lanczos).
function lnGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x; const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const v of c) ser += v / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Regularized upper incomplete gamma Q(s, x).
function gammaQ(s, x) {
  if (x <= 0) return 1;
  if (x < s + 1) {
    let sum = 1 / s; let term = sum; let a = s;
    for (let i = 0; i < 500; i++) { a++; term *= x / a; sum += term; if (Math.abs(term) < Math.abs(sum) * 1e-14) break; }
    return 1 - sum * Math.exp(-x + s * Math.log(x) - lnGamma(s));
  }
  let b = x + 1 - s; let c = 1 / 1e-300; let d = 1 / b; let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - s); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + s * Math.log(x) - lnGamma(s)) * h;
}

// Chi-square goodness of fit. Cells with a small expected count are merged with their neighbours
// (expected >= 5 each), as the test requires. p close to 0 = the history does not look fair.
function chiSquare(observed, expected) {
  const o = []; const e = [];
  let accO = 0; let accE = 0;
  for (let i = 0; i < expected.length; i++) {
    accO += observed[i]; accE += expected[i];
    if (accE >= 5) { o.push(accO); e.push(accE); accO = 0; accE = 0; }
  }
  if (accE > 0) { if (e.length) { o[o.length - 1] += accO; e[e.length - 1] += accE; } else { o.push(accO); e.push(accE); } }
  let chi2 = 0;
  for (let i = 0; i < o.length; i++) chi2 += ((o[i] - e[i]) ** 2) / e[i];
  const df = Math.max(1, o.length - 1);
  return { chi2, df, p: gammaQ(df / 2, chi2 / 2) };
}

// Per-number statistics for one pool. draws: arrays of that pool's numbers, oldest first.
function numberStats(size, pick, draws, { recent = 50 } = {}) {
  const D = draws.length;
  const count = new Array(size + 1).fill(0);
  const recentCount = new Array(size + 1).fill(0);
  const lastSeen = new Array(size + 1).fill(-1);
  const gapSum = new Array(size + 1).fill(0);
  const gapMax = new Array(size + 1).fill(0);
  draws.forEach((nums, t) => {
    for (const x of nums) {
      count[x]++;
      if (t >= D - recent) recentCount[x]++;
      if (lastSeen[x] >= 0) { const g = t - lastSeen[x]; gapSum[x] += g; if (g > gapMax[x]) gapMax[x] = g; }
      lastSeen[x] = t;
    }
  });
  const p = pick / size;
  const expected = D * p;
  const sd = Math.sqrt(D * p * (1 - p)) || 1;
  const recentN = Math.min(recent, D);
  const numbers = [];
  for (let x = 1; x <= size; x++) {
    const gap = lastSeen[x] < 0 ? D : D - 1 - lastSeen[x];
    numbers.push({
      n: x,
      count: count[x],
      share: D ? count[x] / D : 0,
      z: (count[x] - expected) / sd,
      recent: recentCount[x],
      recentZ: recentN ? (recentCount[x] - recentN * p) / (Math.sqrt(recentN * p * (1 - p)) || 1) : 0,
      gap, // draws since it last came out
      avgGap: count[x] > 1 ? gapSum[x] / (count[x] - 1) : null,
      maxGap: gapMax[x],
      // Chance it has stayed out this long by luck alone (the draw has no memory: it is the same next time).
      gapChance: (1 - p) ** gap,
    });
  }
  const fit = chiSquare(numbers.map((x) => x.count), numbers.map(() => expected));
  return { draws: D, expected, numbers, fit, recent: recentN };
}

// Pair co-occurrence ("which numbers like each other"): count of draws with both numbers,
// compared with the expectation for a fair draw. Returns the strongest and weakest pairs and
// the full matrix (row-major, (size+1)^2).
function pairStats(size, pick, draws, { top = 15 } = {}) {
  const D = draws.length;
  const w = size + 1;
  const m = new Array(w * w).fill(0);
  for (const nums of draws) for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) m[nums[i] * w + nums[j]]++;
  const expected = (D * pick * (pick - 1)) / (size * (size - 1));
  const sd = Math.sqrt(expected) || 1;
  const pairs = [];
  for (let x = 1; x <= size; x++) for (let y = x + 1; y <= size; y++) pairs.push({ a: x, b: y, count: m[x * w + y], z: (m[x * w + y] - expected) / sd });
  // The test runs over the pairs in their natural order (merging small cells of a sorted list
  // would bias it), then the list is sorted for display.
  const fit = chiSquare(pairs.map((p) => p.count), pairs.map(() => expected));
  pairs.sort((p, q) => q.count - p.count);
  const never = pairs.filter((p) => p.count === 0).length;
  // Neighbours (x, x+1) come out together exactly as often as any other pair would.
  const neighbours = pairs.filter((p) => p.b === p.a + 1);
  return {
    draws: D, expected, fit, never, matrix: m,
    strongest: pairs.slice(0, top),
    weakest: pairs.slice(-top).reverse(),
    neighbours: { count: neighbours.reduce((s, p) => s + p.count, 0), expected: expected * neighbours.length },
  };
}

// "Which number comes next to which": in every sorted result, each number and the next higher one
// drawn form a neighbour pair (e.g. 12 → 17). For a fair draw the chance that x and y > x are both
// drawn with nothing in between is C(n − (y − x + 1), k − 2) / C(n, k), so every pair has an exact
// expectation to compare with.
function neighbourStats(size, pick, draws, { top = 12 } = {}) {
  const D = draws.length;
  const w = size + 1;
  const m = new Float64Array(w * w);
  for (const nums of draws) for (let i = 1; i < nums.length; i++) m[nums[i - 1] * w + nums[i]]++;
  const all = binom(size, pick);
  const pairs = [];
  for (let x = 1; x <= size; x++) {
    for (let y = x + 1; y <= size; y++) {
      const expected = (D * binom(size - (y - x + 1), pick - 2)) / all;
      if (expected <= 0) continue;
      const count = m[x * w + y];
      pairs.push({ a: x, b: y, count, expected, z: (count - expected) / Math.sqrt(expected) });
    }
  }
  const fit = chiSquare(pairs.map((p) => p.count), pairs.map((p) => p.expected));
  const ranked = pairs.filter((p) => p.expected >= 5).sort((p, q) => q.z - p.z);
  // Distribution of the distance to the next drawn number (1 = neighbours on the coupon).
  const gaps = new Float64Array(size);
  const gapsExpected = new Float64Array(size);
  for (const p of pairs) { gaps[p.b - p.a] += p.count; gapsExpected[p.b - p.a] += p.expected; }
  return { fit, strongest: ranked.slice(0, top), weakest: ranked.slice(-top).reverse(), gaps: Array.from(gaps).slice(1), gapsExpected: Array.from(gapsExpected).slice(1) };
}

// Pattern metrics of the real draws next to their exact distribution over all combinations
// (from filters.distributions). Each metric gets a chi-square test.
function patternStats(pool, cols, draws, expectedDist) {
  const measure = createMeter(pool.size, cols);
  const m = new Array(METRICS.length);
  const observed = METRICS.map(() => new Map());
  for (const nums of draws) {
    measure(nums, m);
    METRICS.forEach((_, i) => observed[i].set(m[i], (observed[i].get(m[i]) || 0) + 1));
  }
  const D = draws.length;
  const out = {};
  METRICS.forEach((id, i) => {
    const exp = expectedDist.metrics[id];
    const total = expectedDist.total;
    const values = exp.counts.map((_, j) => exp.from + j);
    const obs = values.map((v) => observed[i].get(v) || 0);
    const expected = exp.counts.map((c) => (c / total) * D);
    out[id] = { values, observed: obs, expected, probability: exp.counts.map((c) => c / total), fit: chiSquare(obs, expected) };
  });
  return out;
}

// How many numbers each draw repeats from the previous one, against the hypergeometric law.
function repeatStats(size, pick, draws) {
  const obs = new Array(pick + 1).fill(0);
  for (let t = 1; t < draws.length; t++) {
    const prev = new Set(draws[t - 1]);
    obs[draws[t].filter((x) => prev.has(x)).length]++;
  }
  const D = Math.max(0, draws.length - 1);
  const expected = obs.map((_, h) => matchProbability(size, pick, h) * D);
  return { observed: obs, expected, fit: chiSquare(obs, expected) };
}

// Full report for one game: every pool's numbers; patterns, pairs and repeats for the main pool.
function report(game, draws, expectedDist, { recent = 50, halfLife = 0 } = {}) {
  const era = game.eras[game.eras.length - 1];
  const pools = game.pools.map((pool, i) => ({ key: pool.key, size: era.pools[i].size, pick: era.pools[i].pick, ...numberStats(era.pools[i].size, era.pools[i].pick, draws.map((d) => d.pools[i]), { recent }) }));
  const main = draws.map((d) => d.pools[0]);
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
    // Physical bias per pool (machine and balls).
    bias: game.pools.map((pool, i) => (draws.length > 10 ? bias.analyze(era.pools[i].size, era.pools[i].pick, draws.map((d) => d.pools[i]), { halfLife }) : null)),
    combinations: binom(size, pick),
  };
}

// Draws that came out more than once (the same main numbers on different dates).
function repeatedDraws(main) {
  const seen = new Map();
  main.forEach((nums, i) => { const key = nums.join(','); seen.set(key, [...(seen.get(key) || []), i]); });
  return [...seen.entries()].filter(([, idx]) => idx.length > 1).map(([key, idx]) => ({ numbers: key.split(',').map(Number), at: idx }));
}

module.exports = { gammaQ, chiSquare, numberStats, pairStats, neighbourStats, patternStats, repeatStats, repeatedDraws, report };
