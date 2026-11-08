// Pattern metrics of a sorted combination (1-based numbers) in a pool of n on a slip of `cols`
// columns. Built for speed: the census measures millions of combinations, so lookups replace
// arithmetic and scratch arrays are reused.
export const METRICS = ['odd', 'low', 'sum', 'maxRun', 'maxAP', 'maxDecade', 'maxEnding', 'maxRow', 'maxCol', 'spread', 'primes', 'decades', 'consPairs', 'maxMod3', 'maxGap'] as const;
export type MetricId = (typeof METRICS)[number];

export const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);

export type Meter = (combo: ArrayLike<number>, out: number[]) => number[];

// Longest arithmetic progression contained in the set (any common difference).
function longestProgression(a: ArrayLike<number>, n: number, mark: Uint8Array): number {
  const k = a.length;
  let best = k < 2 ? k : 2;
  for (let i = 0; i < k - 2; i++) {
    for (let j = i + 1; j < k - 1; j++) {
      const d = a[j] - a[i];
      if (a[i] + d * best > n) break; // larger j only means a larger step
      let len = 2; let next = a[j] + d;
      while (next <= n && mark[next]) { len++; next += d; }
      if (len > best) best = len;
    }
  }
  return best;
}

export function createMeter(n: number, cols: number): Meter {
  const mark = new Uint8Array(n + 2);
  const half = Math.floor(n / 2);
  // Group of every number (decade, last digit, slip row, slip column) looked up, not computed.
  const groups = [(x: number) => Math.floor(x / 10), (x: number) => x % 10, (x: number) => Math.floor((x - 1) / cols), (x: number) => (x - 1) % cols]
    .map((key) => Uint8Array.from({ length: n + 1 }, (_, x) => key(x)));
  const counts = groups.map((g) => new Uint8Array(Math.max(...g) + 1));
  const prime = Uint8Array.from({ length: n + 1 }, (_, x) => (PRIMES.has(x) ? 1 : 0));
  const decadeSeen = new Uint8Array(11);
  const mod3 = new Uint8Array(3);
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
    out[4] = longestProgression(a, n, mark);
    for (let i = 0; i < k; i++) mark[a[i]] = 0;
    out[0] = odd; out[1] = low; out[2] = sum; out[3] = maxRun;
    for (let g = 0; g < 4; g++) {
      const table = groups[g]; const c = counts[g];
      let best = 0;
      for (let i = 0; i < k; i++) { const v = ++c[table[a[i]]]; if (v > best) best = v; }
      for (let i = 0; i < k; i++) c[table[a[i]]] = 0;
      out[5 + g] = best;
    }
    out[9] = a[k - 1] - a[0];
    // Primes, distinct decades, pairs of neighbours (x, x+1), most numbers with one remainder of
    // division by 3, and the largest gap between neighbouring numbers of the ticket.
    let primes = 0; let decades = 0; let consPairs = 0; let maxGap = 0; let maxMod3 = 0;
    for (let i = 0; i < k; i++) {
      const x = a[i];
      primes += prime[x];
      const d = (x / 10) | 0;
      if (!decadeSeen[d]) { decadeSeen[d] = 1; decades++; }
      const r = ++mod3[x % 3];
      if (r > maxMod3) maxMod3 = r;
      if (i > 0) { const gap = x - a[i - 1]; if (gap === 1) consPairs++; if (gap > maxGap) maxGap = gap; }
    }
    for (let i = 0; i < k; i++) decadeSeen[(a[i] / 10) | 0] = 0;
    mod3[0] = 0; mod3[1] = 0; mod3[2] = 0;
    out[10] = primes; out[11] = decades; out[12] = consPairs; out[13] = maxMod3; out[14] = maxGap;
    return out;
  };
}
