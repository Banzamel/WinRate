// What was known after a list of draws (main-pool numbers, oldest first), for the history and
// weight filters. Draws can be added one by one (walk-forward simulation).
import { binom, rank } from '../combinatorics';
import type { Pool } from '../games';

export class HistoryContext {
  readonly n: number;
  readonly k: number;
  D = 0;
  readonly exact: Uint8Array;
  readonly near: Uint8Array;
  readonly last: Uint8Array;
  numberZ = new Float64Array(0);
  pairZ = new Float64Array(0);
  private readonly counts: Float64Array;
  private readonly pairCounts: Float64Array;
  private readonly sub: number[];
  private dirty = true;

  constructor(pool: Pool, draws: number[][] = []) {
    const { size: n, pick: k } = pool;
    this.n = n; this.k = k;
    this.exact = new Uint8Array(binom(n, k));
    this.near = new Uint8Array(binom(n, k - 1));
    this.counts = new Float64Array(n + 1);
    this.pairCounts = new Float64Array((n + 1) * (n + 1));
    this.last = new Uint8Array(n + 1);
    this.sub = new Array<number>(k - 1);
    for (const nums of draws) this.add(nums);
  }

  add(nums: number[]): void {
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
      for (let j = i + 1; j < k; j++) this.pairCounts[nums[i] * (n + 1) + nums[j]]++;
    }
    this.D++;
    this.dirty = true;
  }

  // Frequency z-score of every number and of every pair (recomputed lazily after add()).
  scores(): this {
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
