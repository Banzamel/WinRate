import { binom } from './binomial';

// Probability of exactly `hit` matches when `pick` numbers out of `size` are drawn and the ticket
// has `pick` numbers too.
export const matchProbability = (size: number, pick: number, hit: number): number =>
  (binom(pick, hit) * binom(size - pick, pick - hit)) / binom(size, pick);
