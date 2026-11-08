// Saved coupons checked against the results: hits per ticket and the prize tier.
import type { Draw, Tier } from '../../core/games';
import type { Coupon } from '../settings';

export interface CheckedTicket { tk: number[][]; hits: number[]; tier: Tier | null }
export interface CouponCheck { draw: Draw; rows: CheckedTicket[]; fixed: number; pool: number }

// null: the draw of the coupon's date is not in the history (yet).
export function checkCoupon(coupon: Coupon, draws: Draw[], tiers: Tier[]): CouponCheck | null {
  const draw = draws.find((d) => d.date === coupon.drawDate);
  if (!draw) return null;
  const rows = coupon.tickets.map((tk) => {
    const hits = tk.map((nums, i) => nums.filter((x) => draw.pools[i].includes(x)).length);
    return { tk, hits, tier: tiers.find((tier) => tier.hits.every((h, i) => h === hits[i])) || null };
  });
  const fixed = rows.reduce((s, r) => s + (r.tier && r.tier.fixed ? r.tier.fixed : 0), 0);
  return { draw, rows, fixed, pool: rows.filter((r) => r.tier && !r.tier.fixed).length };
}

export const hitSum = (r: CheckedTicket): number => r.hits.reduce((s, h) => s + h, 0);

// Tickets as text for the clipboard: pools separated by " | ", one ticket per line.
export const ticketsText = (tickets: number[][][]): string => tickets.map((tk) => tk.map((p) => p.join(' ')).join(' | ')).join('\n');

// Numbers typed by the player, split into the pools (duplicates dropped, sorted).
export function parseTyped(text: string, picks: number[]): number[][] {
  const nums = (text.match(/\d+/g) || []).map(Number);
  let at = 0;
  return picks.map((pick) => { const part = [...new Set(nums.slice(at, at + pick))].sort((a, b) => a - b); at += pick; return part; });
}
