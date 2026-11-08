// Chi-square goodness of fit with the regularized incomplete gamma function for the p-value.
import type { Fit } from './types';

// ln Γ(x) (Lanczos).
function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x; const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const v of c) ser += v / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Regularized upper incomplete gamma Q(s, x): series below s + 1, continued fraction above.
export function gammaQ(s: number, x: number): number {
  if (x <= 0) return 1;
  if (x < s + 1) {
    let sum = 1 / s; let term = sum; let a = s;
    for (let i = 0; i < 500; i++) { a++; term *= x / a; sum += term; if (Math.abs(term) < Math.abs(sum) * 1e-14) break; }
    return 1 - sum * Math.exp(-x + s * Math.log(x) - lnGamma(s));
  }
  let b = x + 1 - s; let c = 1 / 1e-300; let d = 1 / b; let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - s); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + s * Math.log(x) - lnGamma(s)) * h;
}

// Cells with a small expected count are merged with their neighbours (expected >= 5 each), as the
// test requires. p close to 0 = the history does not look fair.
export function chiSquare(observed: ArrayLike<number>, expected: ArrayLike<number>): Fit {
  const o: number[] = []; const e: number[] = [];
  let accO = 0; let accE = 0;
  for (let i = 0; i < expected.length; i++) {
    accO += observed[i]; accE += expected[i];
    if (accE >= 5) { o.push(accO); e.push(accE); accO = 0; accE = 0; }
  }
  if (accE > 0) {
    if (e.length) { o[o.length - 1] += accO; e[e.length - 1] += accE; } else { o.push(accO); e.push(accE); }
  }
  let chi2 = 0;
  for (let i = 0; i < o.length; i++) chi2 += ((o[i] - e[i]) ** 2) / e[i];
  const df = Math.max(1, o.length - 1);
  return { chi2, df, p: gammaQ(df / 2, chi2 / 2) };
}
