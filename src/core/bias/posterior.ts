// Empirical-Bayes (James–Stein) estimate of the chance of every number. The spread of the observed
// frequencies is split into sampling noise (known exactly) and real differences between the balls;
// each number is pulled towards the fair value k/n by the share that is noise. A fair machine has no
// real differences, so every estimate collapses to k/n and nothing is "found" — this is what stops
// the winner's curse of picking the luckiest-looking numbers.
import { phi } from './distributions';
import type { Posterior, PosteriorNumber } from './types';

// halfLife: draws after which an old draw counts half (follows ball-set or machine changes).
export function posterior(size: number, pick: number, draws: number[][], { halfLife = 0 } = {}): Posterior {
  const p0 = pick / size;
  const c = new Float64Array(size + 1);
  let D = 0; let D2 = 0;
  const T = draws.length;
  draws.forEach((nums, t) => {
    const w = halfLife ? 0.5 ** ((T - 1 - t) / halfLife) : 1;
    D += w; D2 += w * w;
    for (const x of nums) c[x] += w;
  });
  const nEff = D2 ? (D * D) / D2 : 0; // effective number of draws behind the weighted counts
  const noise = nEff ? (p0 * (1 - p0)) / nEff : 0;
  let spread = 0;
  for (let x = 1; x <= size; x++) spread += ((D ? c[x] / D : p0) - p0) ** 2;
  spread /= size - 1;
  // Differences are only believed when the spread is significantly larger than noise (chi-square
  // test at 5 %, Wilson–Hilferty); otherwise every ball keeps the fair chance.
  const df = size - 1;
  const chi2 = noise ? (df * spread) / noise : 0;
  const wh = ((chi2 / df) ** (1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  const significant = 1 - phi(wh) < 0.05;
  const signal = significant ? Math.max(0, spread - noise) : 0; // variance of the true chances between balls
  const shrink = signal + noise ? signal / (signal + noise) : 0; // 0 = all noise
  const numbers: PosteriorNumber[] = [];
  for (let x = 1; x <= size; x++) {
    const f = D ? c[x] / D : p0;
    const mean = p0 + shrink * (f - p0);
    const sd = Math.sqrt(shrink * noise) || 1e-12;
    numbers.push({ n: x, observed: f, p: mean, sd, edge: mean / p0 - 1, above: shrink ? 1 - phi((p0 - mean) / sd) : 0.5 });
  }
  return { p0, effectiveDraws: nEff, signal: Math.sqrt(signal), noise: Math.sqrt(noise), shrink, pValue: 1 - phi(wh), numbers };
}
