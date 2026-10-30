// Abbreviated wheels (covering designs): from m chosen numbers, the fewest tickets of k numbers such
// that whenever at least t of the drawn numbers are among your m, some ticket has t of them.
// The greedy cover is within a factor ln C(k,t) of the optimum and is usually close to the
// best published wheels for small m.
const { binom, rank, forEachCombination } = require('./combinatorics');

function wheel(numbers, k, t, { maxCandidates = 200000 } = {}) {
  const chosen = [...new Set(numbers)].sort((a, b) => a - b);
  const m = chosen.length;
  if (m < k) throw new Error(`choose at least ${k} numbers`);
  if (t < 1 || t > k) throw new Error('bad guarantee');
  if (binom(m, k) > maxCandidates) throw new Error(`too many numbers (${binom(m, k)} candidate tickets)`);
  // Candidates and targets are subsets of positions 1..m.
  const candidates = [];
  forEachCombination(m, k, (a) => { candidates.push(Int32Array.from(a)); });
  const covered = new Uint8Array(binom(m, t));
  let left = covered.length;
  const sub = new Array(t);
  // t-subsets (by rank) of a candidate
  const subsetsOf = (c) => {
    const out = [];
    forEachCombination(k, t, (idx) => { for (let i = 0; i < t; i++) sub[i] = c[idx[i] - 1]; out.push(rank(sub)); });
    return out;
  };
  const cover = candidates.map(subsetsOf);
  const gain = cover.map((s) => s.length);
  const tickets = [];
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

module.exports = { wheel };
