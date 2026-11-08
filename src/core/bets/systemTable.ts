// Lotto system bets: m numbers (7–12) on one bet play every 6-number combination of them, C(m, 6)
// bets at the normal price. Whatever the draw, the prizes follow from j — how many of the drawn
// numbers are among your m: then C(j, i) · C(m − j, 6 − i) of the bets have exactly i hits.
import { binom } from '../combinatorics';
import type { TierRule } from '../games';

export interface SystemRow { drawnAmongYours: number; probability: number; oneIn: number | null; wins: Record<string, number> }
export interface SystemTable { m: number; bets: number; rows: SystemRow[]; jackpot: number; any: number }

export function systemTable(size: number, pick: number, m: number, tiers: TierRule[]): SystemTable {
  const rows: SystemRow[] = [];
  for (let j = 0; j <= pick; j++) {
    const probability = (binom(m, j) * binom(size - m, pick - j)) / binom(size, pick);
    const wins: Record<string, number> = {};
    for (const tier of tiers) {
      const i = tier.hits[0];
      const n = binom(j, i) * binom(m - j, pick - i);
      if (n) wins[tier.id] = n;
    }
    rows.push({ drawnAmongYours: j, probability, oneIn: probability ? 1 / probability : null, wins });
  }
  // Chance that the system wins anything / the jackpot in one draw.
  const minHits = Math.min(...tiers.map((t) => t.hits[0]));
  const any = rows.filter((r) => r.drawnAmongYours >= minHits).reduce((s, r) => s + r.probability, 0);
  return { m, bets: binom(m, pick), rows, jackpot: rows[pick].probability, any };
}
