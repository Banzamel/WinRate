// Binomial coefficients from a precomputed Pascal table (n ≤ 100, k ≤ 10 covers every game),
// with a product formula beyond it.
export const MAX_N = 100;
export const MAX_K = 10;

export const PASCAL: number[][] = (() => {
  const table: number[][] = [];
  for (let n = 0; n <= MAX_N; n++) {
    table[n] = new Array<number>(MAX_K + 1).fill(0);
    table[n][0] = 1;
    for (let k = 1; k <= MAX_K && k <= n; k++) table[n][k] = table[n - 1][k - 1] + (k <= n - 1 ? table[n - 1][k] : 0);
  }
  return table;
})();

export function binom(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0;
  if (n <= MAX_N && k <= MAX_K) return PASCAL[n][k];
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
