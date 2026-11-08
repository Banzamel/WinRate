import { matchProbability } from '../combinatorics';
import { chiSquare } from './chiSquare';
import type { RepeatedDraw, RepeatStats } from './types';

// How many numbers each draw repeats from the previous one, against the hypergeometric law.
export function repeatStats(size: number, pick: number, draws: number[][]): RepeatStats {
  const obs = new Array<number>(pick + 1).fill(0);
  for (let t = 1; t < draws.length; t++) {
    const prev = new Set(draws[t - 1]);
    obs[draws[t].filter((x) => prev.has(x)).length]++;
  }
  const D = Math.max(0, draws.length - 1);
  const expected = obs.map((_, h) => matchProbability(size, pick, h) * D);
  return { observed: obs, expected, fit: chiSquare(obs, expected) };
}

// Draws that came out more than once (the same main numbers on different dates).
export function repeatedDraws(main: number[][]): RepeatedDraw[] {
  const seen = new Map<string, number[]>();
  main.forEach((nums, i) => { const key = nums.join(','); seen.set(key, [...(seen.get(key) || []), i]); });
  return [...seen.entries()].filter(([, idx]) => idx.length > 1).map(([key, idx]) => ({ numbers: key.split(',').map(Number), at: idx }));
}
