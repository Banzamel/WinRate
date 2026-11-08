// Abbreviated wheels (covering designs): from m chosen numbers, the fewest tickets of k numbers such
// that whenever at least t of the drawn numbers are among your m, some ticket has t of them.
// The greedy cover is within a factor ln C(k,t) of the optimum and is usually close to the best
// published wheels for small m.
import { binom, forEachCombination, rank } from '../combinatorics';

export interface Wheel { numbers: number[]; k: number; t: number; tickets: number[][]; full: number }

// t-subsets (by rank) of every candidate ticket (subsets of positions 1..m).
function coverOf(candidates: Int32Array[], k: number, t: number): number[][] {
  const sub = new Array<number>(t);
  return candidates.map((c) => {
    const out: number[] = [];
    forEachCombination(k, t, (idx) => { for (let i = 0; i < t; i++) sub[i] = c[idx[i] - 1]; out.push(rank(sub)); });
    return out;
  });
}

export function wheel(numbers: number[], k: number, t: number, { maxCandidates = 200000 } = {}): Wheel {
  const chosen = [...new Set(numbers)].sort((a, b) => a - b);
  const m = chosen.length;
  if (m < k) throw new Error(`choose at least ${k} numbers`);
  if (t < 1 || t > k) throw new Error('bad guarantee');
  if (binom(m, k) > maxCandidates) throw new Error(`too many numbers (${binom(m, k)} candidate tickets)`);
  const candidates: Int32Array[] = [];
  forEachCombination(m, k, (a) => { candidates.push(Int32Array.from(a)); });
  const covered = new Uint8Array(binom(m, t));
  let left = covered.length;
  const cover = coverOf(candidates, k, t);
  const gain = cover.map((s) => s.length);
  const tickets: number[][] = [];
  while (left > 0) {
    let best = -1; let bestGain = 0;
    for (let i = 0; i < cover.length; i++) if (gain[i] > bestGain) { bestGain = gain[i]; best = i; }
    if (best < 0) break;
    tickets.push(Array.from(candidates[best], (p) => chosen[p - 1]));
    for (const r of cover[best]) if (!covered[r]) { covered[r] = 1; left--; }
    for (let i = 0; i < cover.length; i++) if (gain[i]) gain[i] = cover[i].reduce((s, r) => s + (covered[r] ? 0 : 1), 0);
  }
  return { numbers: chosen, k, t, tickets, full: binom(m, k) };
}
