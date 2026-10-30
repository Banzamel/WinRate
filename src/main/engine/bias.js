// Physical bias of the draw machine and balls — the only thing that could ever make some numbers
// more likely. A slightly heavier, smaller or worn ball, or a machine that mixes badly, would show
// up as (1) a persistent excess of a number, (2) a change of frequency over time (a new ball set or
// machine) or (3) memory between draws. Each is tested here; when nothing is found the estimates
// fall back to the fair values, so using them can never hurt.
const { matchProbability } = require('./combinatorics');

const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function erf(x) {
  // Abramowitz–Stegun 7.1.26 (|error| < 1.5e-7)
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

// P(sup |Brownian bridge| > k) — Kolmogorov distribution.
function kolmogorovP(k) {
  if (k < 0.2) return 1;
  let p = 0;
  for (let j = 1; j <= 100; j++) {
    const term = 2 * (j % 2 ? 1 : -1) * Math.exp(-2 * j * j * k * k);
    p += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return Math.max(0, Math.min(1, p));
}

// Empirical-Bayes (James–Stein) estimate of the chance of every number. The spread of the observed
// frequencies is split into sampling noise (known exactly) and real differences between the balls;
// each number is pulled towards the fair value k/n by the share that is noise. A fair machine has no
// real differences, so every estimate collapses to k/n and nothing is "found" — this is what stops
// the winner's curse of picking the luckiest-looking numbers.
// halfLife: draws after which an old draw counts half (follows ball-set or machine changes).
function posterior(size, pick, draws, { halfLife = 0 } = {}) {
  const p0 = pick / size;
  const c = new Float64Array(size + 1);
  let D = 0; let D2 = 0;
  const T = draws.length;
  draws.forEach((nums, t) => {
    const w = halfLife ? 0.5 ** ((T - 1 - t) / halfLife) : 1;
    D += w; D2 += w * w;
    for (const x of nums) c[x] += w;
  });
  const nEff = D2 ? (D * D) / D2 : 0; // effective number of draws behind the weighted counts
  const noise = nEff ? (p0 * (1 - p0)) / nEff : 0;
  let spread = 0;
  for (let x = 1; x <= size; x++) spread += ((D ? c[x] / D : p0) - p0) ** 2;
  spread /= size - 1;
  // Differences are only believed when the spread is significantly larger than noise (chi-square
  // test at 5 %, Wilson–Hilferty); otherwise every ball keeps the fair chance.
  const df = size - 1;
  const chi2 = noise ? (df * spread) / noise : 0;
  const wh = ((chi2 / df) ** (1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  const significant = 1 - phi(wh) < 0.05;
  const signal = significant ? Math.max(0, spread - noise) : 0; // variance of the true chances between balls
  const shrink = signal + noise ? signal / (signal + noise) : 0; // 0 = all noise
  const out = [];
  for (let x = 1; x <= size; x++) {
    const f = D ? c[x] / D : p0;
    const mean = p0 + shrink * (f - p0);
    const sd = Math.sqrt(shrink * noise) || 1e-12;
    out.push({ n: x, observed: f, p: mean, sd, edge: mean / p0 - 1, above: shrink ? 1 - phi((p0 - mean) / sd) : 0.5 });
  }
  return { p0, effectiveDraws: nEff, signal: Math.sqrt(signal), noise: Math.sqrt(noise), shrink, pValue: 1 - phi(wh), numbers: out };
}

// Did the frequency of a number change over time? Cumulative deviation from the number's own
// average (a Brownian bridge if it never changed); the largest excursion is tested with the
// Kolmogorov law and the turning point is where the change most likely happened.
function drift(size, draws) {
  const T = draws.length;
  const hits = Array.from({ length: size + 1 }, () => new Uint8Array(T));
  draws.forEach((nums, t) => { for (const x of nums) hits[x][t] = 1; });
  const res = [];
  for (let x = 1; x <= size; x++) {
    const h = hits[x];
    let total = 0;
    for (let t = 0; t < T; t++) total += h[t];
    const mean = total / T;
    const sd = Math.sqrt(T * mean * (1 - mean)) || 1;
    let s = 0; let best = 0; let at = 0;
    for (let t = 0; t < T; t++) {
      s += h[t] - mean;
      if (Math.abs(s) > Math.abs(best)) { best = s; at = t; }
    }
    const k = Math.abs(best) / sd;
    // Frequency before and after the most likely change point.
    let before = 0;
    for (let t = 0; t <= at; t++) before += h[t];
    const after = total - before;
    res.push({ n: x, k, p: kolmogorovP(k), at, before: before / (at + 1), after: T - at - 1 ? after / (T - at - 1) : null });
  }
  res.sort((a, b) => a.p - b.p);
  // Šidák correction: the chance that the most extreme of n fair numbers looks this extreme.
  const overall = 1 - (1 - res[0].p) ** size;
  return { numbers: res, overall };
}

// Memory between draws: how many numbers draw t shares with draw t−lag, for lag 1..maxLag,
// against the hypergeometric expectation (a well-mixed machine forgets immediately).
function memory(size, pick, draws, maxLag = 10) {
  const mean = (pick * pick) / size;
  let variance = 0;
  for (let h = 0; h <= pick; h++) variance += matchProbability(size, pick, h) * (h - mean) ** 2;
  const sets = draws.map((d) => new Set(d));
  const lags = [];
  for (let lag = 1; lag <= maxLag && lag < draws.length; lag++) {
    let shared = 0;
    const pairs = draws.length - lag;
    for (let t = lag; t < draws.length; t++) for (const x of draws[t]) if (sets[t - lag].has(x)) shared++;
    const expected = pairs * mean;
    const z = (shared - expected) / Math.sqrt(pairs * variance);
    lags.push({ lag, shared, expected, z, p: 2 * (1 - phi(Math.abs(z))) });
  }
  return lags;
}

// Wald–Wolfowitz runs test of the sequence "odd count above / below its median" — a classic
// check that the draws are not clustered in time.
function runsTest(values) {
  const med = [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const s = values.filter((v) => v !== med).map((v) => v > med);
  const n1 = s.filter(Boolean).length; const n2 = s.length - n1;
  if (!n1 || !n2) return null;
  let runs = 1;
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]) runs++;
  const mu = (2 * n1 * n2) / (n1 + n2) + 1;
  const v = (2 * n1 * n2 * (2 * n1 * n2 - n1 - n2)) / ((n1 + n2) ** 2 * (n1 + n2 - 1));
  const z = (runs - mu) / Math.sqrt(v);
  return { runs, expected: mu, z, p: 2 * (1 - phi(Math.abs(z))) };
}

// Everything above for one pool, plus the best edge physically available: the jackpot chance of a
// ticket made of the most likely numbers relative to a fair ticket (independent-inclusion estimate).
function analyze(size, pick, draws, opts = {}) {
  const post = posterior(size, pick, draws, opts);
  const top = [...post.numbers].sort((a, b) => b.p - a.p).slice(0, pick);
  const bestEdge = top.reduce((m, x) => m * (x.p / post.p0), 1);
  return {
    posterior: post,
    best: { numbers: top.map((x) => x.n).sort((a, b) => a - b), edge: bestEdge },
    drift: drift(size, draws),
    memory: memory(size, pick, draws),
    runs: runsTest(draws.map((d) => d.reduce((s, x) => s + x, 0))),
  };
}

module.exports = { posterior, drift, memory, runsTest, analyze, kolmogorovP, phi };
