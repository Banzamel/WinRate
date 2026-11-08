// Probability laws used by the tests of the draw machine.

// Normal CDF via erf (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7).
function erf(x: number): number {
  const s = Math.sign(x); const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

export const phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

// P(sup |Brownian bridge| > k) — Kolmogorov distribution.
export function kolmogorovP(k: number): number {
  if (k < 0.2) return 1;
  let p = 0;
  for (let j = 1; j <= 100; j++) {
    const term = 2 * (j % 2 ? 1 : -1) * Math.exp(-2 * j * j * k * k);
    p += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return Math.max(0, Math.min(1, p));
}
