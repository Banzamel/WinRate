// Per-number statistics for one pool: frequency, hot/cold window and gaps. draws: arrays of that
// pool's numbers, oldest first.
import { chiSquare } from './chiSquare';
import type { NumberStat, NumberStats } from './types';

export function numberStats(size: number, pick: number, draws: number[][], { recent = 50 } = {}): NumberStats {
  const D = draws.length;
  const count = new Array<number>(size + 1).fill(0);
  const recentCount = new Array<number>(size + 1).fill(0);
  const lastSeen = new Array<number>(size + 1).fill(-1);
  const gapSum = new Array<number>(size + 1).fill(0);
  const gapMax = new Array<number>(size + 1).fill(0);
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
  const numbers: NumberStat[] = [];
  for (let x = 1; x <= size; x++) {
    const gap = lastSeen[x] < 0 ? D : D - 1 - lastSeen[x];
    numbers.push({
      n: x,
      count: count[x],
      share: D ? count[x] / D : 0,
      z: (count[x] - expected) / sd,
      recent: recentCount[x],
      recentZ: recentN ? (recentCount[x] - recentN * p) / (Math.sqrt(recentN * p * (1 - p)) || 1) : 0,
      gap,
      avgGap: count[x] > 1 ? gapSum[x] / (count[x] - 1) : null,
      maxGap: gapMax[x],
      // The draw has no memory: this chance is the same next time.
      gapChance: (1 - p) ** gap,
    });
  }
  const fit = chiSquare(numbers.map((x) => x.count), numbers.map(() => expected));
  return { draws: D, expected, numbers, fit, recent: recentN };
}
