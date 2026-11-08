// What a ticket pays back on average, and how sharing the jackpot changes it.
import type { Tier } from '../games';

export interface EvGame { tiers: Tier[]; combinations: number; price: { amount: number } }
export interface EvInput { jackpot: number; sold: number; popularity?: number; prizes?: Record<string, number>; tax?: number; taxFree?: number }
export interface EvResult {
  share: number;
  jackpotEV: number;
  otherEV: number;
  tiers: { id: string; amount: number; ev: number }[];
  total: number;
  price: number;
  net: number;
  returnRate: number;
  breakEven: number | null;
}

// Expected share of the jackpot for one winning ticket when `sold` tickets are played and the ticket
// is `popularity` times as popular as average: other winners W ~ Poisson(λ), E[1/(1+W)].
export function jackpotShare(popularity: number, sold: number, combinations: number): number {
  const lambda = (popularity * sold) / combinations;
  return lambda < 1e-9 ? 1 : (1 - Math.exp(-lambda)) / lambda;
}

// The jackpot (shared with the expected number of other winners, after tax) plus every other tier —
// fixed prizes as published, pool prizes at the average amounts given. taxFree: prizes up to this
// amount are tax-free in Poland. Lower pool prizes are shared among so many winners that popularity
// barely moves them.
export function expectedValue(game: EvGame, { jackpot, sold, popularity = 1, prizes = {}, tax = 0.1, taxFree = 2280 }: EvInput): EvResult {
  const [top, ...rest] = game.tiers;
  const share = jackpotShare(popularity, sold, game.combinations);
  const net = (v: number) => (v > taxFree ? v * (1 - tax) : v);
  const jackpotEV = top.probability * net(jackpot * share);
  const tiers = rest.map((t) => { const amount = t.fixed || prizes[t.id] || 0; return { id: t.id, amount, ev: t.probability * net(amount) }; });
  const otherEV = tiers.reduce((s, t) => s + t.ev, 0);
  const total = jackpotEV + otherEV;
  const price = game.price.amount;
  return { share, jackpotEV, otherEV, tiers, total, price, net: total - price, returnRate: total / price, breakEven: breakEven(top.probability, share, otherEV, price, net) };
}

// Jackpot at which the ticket pays back its price on average (ignoring rollovers' effect on sales).
function breakEven(p: number, share: number, otherEV: number, price: number, net: (v: number) => number): number | null {
  if (otherEV >= price) return null;
  let lo = 0; let hi = 1e12;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (p * net(mid * share) + otherEV < price) lo = mid; else hi = mid;
  }
  return hi < 1e12 ? hi : null;
}
