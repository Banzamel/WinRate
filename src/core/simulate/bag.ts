// Drawing like a machine (one ball at a time from those left) and the "already played" bitset.
import type { Rng } from './rng';

export const newBag = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

// Draws `pick` different numbers of the bag (a permutation of 1..n kept between calls), sorted into `out`.
export function drawNumbers(rng: Rng, bag: number[], pick: number, out: number[]): number[] {
  const n = bag.length;
  for (let i = 0; i < pick; i++) {
    const j = i + rng.int(n - i);
    const x = bag[j]; bag[j] = bag[i]; bag[i] = x;
    out[i] = x;
  }
  for (let i = 1; i < pick; i++) { const x = out[i]; let j = i - 1; while (j >= 0 && out[j] > x) { out[j + 1] = out[j]; j--; } out[j + 1] = x; }
  return out;
}

export const testBit = (bits: Uint8Array, i: number): number => (bits[i >>> 3] >> (i & 7)) & 1;
export const setBit = (bits: Uint8Array, i: number): void => { bits[i >>> 3] |= 1 << (i & 7); };
