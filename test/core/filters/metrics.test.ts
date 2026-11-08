import { expect, test } from 'vitest';
import { createMeter } from '../../../src/core/filters';

test('pattern metrics', () => {
  const m = createMeter(49, 7);
  // odd, low, sum, maxRun, maxAP, maxDecade, maxEnding, maxRow, maxCol, spread
  expect(m([1, 2, 3, 4, 5, 6], [])).toEqual([3, 6, 21, 6, 6, 6, 1, 6, 1, 5, 3, 1, 5, 2, 1]);
  // primes, decades, neighbour pairs, most with one remainder mod 3, largest gap
  expect(m([2, 9, 15, 27, 40, 49], []).slice(10)).toEqual([1, 4, 0, 3, 13]);
  expect(m([3, 10, 17, 24, 30, 45], []).slice(4, 5)).toEqual([4]);
  expect(m([5, 10, 15, 20, 25, 49], [])[4]).toBe(5);
});
