// Every sorted combination of 1-based numbers has a unique rank 0..C(n,k)-1 in colexicographic
// order, so "all combinations" never has to be stored: a bitset indexed by rank is enough.
import { MAX_N, PASCAL } from './binomial';

export function rank(nums: ArrayLike<number>): number {
  let r = 0;
  for (let i = 0; i < nums.length; i++) r += PASCAL[nums[i] - 1][i + 1];
  return r;
}

// Inverse of rank(): the sorted combination of k numbers with the given rank.
export function unrank(r: number, k: number): number[] {
  const out = new Array<number>(k);
  let c = MAX_N;
  for (let i = k; i >= 1; i--) {
    while (PASCAL[c][i] > r) c--;
    out[i - 1] = c + 1;
    r -= PASCAL[c][i];
  }
  return out;
}
