// Combinations of k numbers out of 1..n: binomial coefficients, ranking and enumeration.
// Every combination (sorted ascending) has a unique rank 0..C(n,k)-1 in colexicographic
// order, so "all combinations" never has to be stored: a bitset indexed by rank is enough.

const MAX_N = 100;
const MAX_K = 10;
const TABLE = [];
for (let n = 0; n <= MAX_N; n++) {
  TABLE[n] = new Array(MAX_K + 1).fill(0);
  TABLE[n][0] = 1;
  for (let k = 1; k <= MAX_K && k <= n; k++) TABLE[n][k] = TABLE[n - 1][k - 1] + (k <= n - 1 ? TABLE[n - 1][k] : 0);
}

function binom(n, k) {
  if (k < 0 || n < 0 || k > n) return 0;
  if (n <= MAX_N && k <= MAX_K) return TABLE[n][k];
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

// Rank of a sorted combination of 1-based numbers.
function rank(nums) {
  let r = 0;
  for (let i = 0; i < nums.length; i++) r += TABLE[nums[i] - 1][i + 1];
  return r;
}

// Inverse of rank(): the sorted combination of k numbers with the given rank.
function unrank(r, k) {
  const out = new Array(k);
  let c = MAX_N;
  for (let i = k; i >= 1; i--) {
    while (TABLE[c][i] > r) c--;
    out[i - 1] = c + 1;
    r -= TABLE[c][i];
  }
  return out;
}

// Calls fn(combo) for every sorted combination of k numbers from 1..n in rank order.
// The array is reused between calls: copy it if it has to be kept.
function forEachCombination(n, k, fn) {
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

// Hypergeometric probability of exactly `hit` matches when `pick` numbers out of `size`
// are drawn and the ticket has `pick` numbers too.
const matchProbability = (size, pick, hit) => (binom(pick, hit) * binom(size - pick, pick - hit)) / binom(size, pick);

module.exports = { binom, rank, unrank, forEachCombination, matchProbability };
