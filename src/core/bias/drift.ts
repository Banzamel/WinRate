// Did the frequency of a number change over time (a new ball set or machine)? Cumulative deviation
// from the number's own average (a Brownian bridge if it never changed); the largest excursion is
// tested with the Kolmogorov law and the turning point is where the change most likely happened.
import { kolmogorovP } from './distributions';
import type { Drift, DriftNumber } from './types';

function numberDrift(x: number, hits: Uint8Array): DriftNumber {
  const T = hits.length;
  let total = 0;
  for (let t = 0; t < T; t++) total += hits[t];
  const mean = total / T;
  const sd = Math.sqrt(T * mean * (1 - mean)) || 1;
  let s = 0; let best = 0; let at = 0;
  for (let t = 0; t < T; t++) {
    s += hits[t] - mean;
    if (Math.abs(s) > Math.abs(best)) { best = s; at = t; }
  }
  const k = Math.abs(best) / sd;
  // Frequency before and after the most likely change point.
  let before = 0;
  for (let t = 0; t <= at; t++) before += hits[t];
  const after = total - before;
  return { n: x, k, p: kolmogorovP(k), at, before: before / (at + 1), after: T - at - 1 ? after / (T - at - 1) : null };
}

export function drift(size: number, draws: number[][]): Drift {
  const T = draws.length;
  const hits = Array.from({ length: size + 1 }, () => new Uint8Array(T));
  draws.forEach((nums, t) => { for (const x of nums) hits[x][t] = 1; });
  const numbers: DriftNumber[] = [];
  for (let x = 1; x <= size; x++) numbers.push(numberDrift(x, hits[x]));
  numbers.sort((a, b) => a.p - b.p);
  // Šidák correction: the chance that the most extreme of n fair numbers looks this extreme.
  return { numbers, overall: 1 - (1 - numbers[0].p) ** size };
}
