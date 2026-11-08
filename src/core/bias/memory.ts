import { matchProbability } from '../combinatorics';
import { phi } from './distributions';
import type { MemoryLag, RunsTest } from './types';

// Memory between draws: how many numbers draw t shares with draw t−lag, for lag 1..maxLag,
// against the hypergeometric expectation (a well-mixed machine forgets immediately).
export function memory(size: number, pick: number, draws: number[][], maxLag = 10): MemoryLag[] {
  const mean = (pick * pick) / size;
  let variance = 0;
  for (let h = 0; h <= pick; h++) variance += matchProbability(size, pick, h) * (h - mean) ** 2;
  const sets = draws.map((d) => new Set(d));
  const lags: MemoryLag[] = [];
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

// Wald–Wolfowitz runs test of the sequence "value above / below its median" — a classic check that
// the draws are not clustered in time.
export function runsTest(values: number[]): RunsTest | null {
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
