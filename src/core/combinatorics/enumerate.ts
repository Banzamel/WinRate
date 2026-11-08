// Calls fn(combo) for every sorted combination of k numbers from 1..n in rank order; returning
// false stops. The array is reused between calls: copy it if it has to be kept.
export function forEachCombination(n: number, k: number, fn: (combo: number[]) => boolean | void): void {
  const a = Array.from({ length: k }, (_, i) => i + 1);
  for (;;) {
    if (fn(a) === false) return;
    // Colex successor: increase the lowest position that can grow, reset the ones below it.
    let i = 0;
    while (i < k - 1 && a[i] + 1 === a[i + 1]) { a[i] = i + 1; i++; }
    if (i === k - 1 && a[i] === n) return;
    a[i]++;
  }
}
