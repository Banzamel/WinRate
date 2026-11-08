// Pair co-occurrence ("which numbers like each other"): draws with both numbers, against the
// expectation for a fair draw.
import { chiSquare } from './chiSquare';
import type { Pair, PairStats } from './types';

export function pairStats(size: number, pick: number, draws: number[][], { top = 15 } = {}): PairStats {
  const D = draws.length;
  const w = size + 1;
  const m = new Array<number>(w * w).fill(0);
  for (const nums of draws) for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) m[nums[i] * w + nums[j]]++;
  const expected = (D * pick * (pick - 1)) / (size * (size - 1));
  const sd = Math.sqrt(expected) || 1;
  const pairs: Pair[] = [];
  for (let x = 1; x <= size; x++) for (let y = x + 1; y <= size; y++) pairs.push({ a: x, b: y, count: m[x * w + y], z: (m[x * w + y] - expected) / sd });
  // The test runs over the pairs in their natural order (merging small cells of a sorted list
  // would bias it), then the list is sorted for display.
  const fit = chiSquare(pairs.map((p) => p.count), pairs.map(() => expected));
  pairs.sort((p, q) => q.count - p.count);
  // Neighbours (x, x+1) come out together exactly as often as any other pair would.
  const neighbours = pairs.filter((p) => p.b === p.a + 1);
  return {
    draws: D, expected, fit, matrix: m,
    never: pairs.filter((p) => p.count === 0).length,
    strongest: pairs.slice(0, top),
    weakest: pairs.slice(-top).reverse(),
    neighbours: { count: neighbours.reduce((s, p) => s + p.count, 0), expected: expected * neighbours.length },
  };
}
