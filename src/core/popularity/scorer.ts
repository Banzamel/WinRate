// How many other players are likely to play a ticket. People do not pick at random: they play
// birthdays (1–31), months (1–12), lucky numbers, runs, progressions, lines on the coupon and the
// last result (Henze 1997; Henze & Riedwyl 1998; Crack & Whigham). The weights are estimates in
// log-units taken from those findings, not measured sales data.
import { createMeter } from '../filters';
import type { Pool } from '../games';

export const WEIGHTS = {
  birthday: 0.12, // each number 1..31
  allBirthdays: 0.6, // every number 1..31
  month: 0.08, // each number 1..12
  seven: 0.15, // the number 7
  multipleOf7: 0.05,
  high: -0.04, // each number above 31 (chosen less)
  // Patterns do not add up: a ticket counts as its most striking pattern. A full run such as
  // 1-2-3-4-5-6 lands at a few thousand times the average ticket, as reported for 6/49 games.
  run: 0.8, fullRun: 6.5,
  progression: 0.7, fullProgression: 5,
  line: 0.8, fullLine: 5,
  lastDraw: 0.3, // each number of the previous draw
  allLastDraw: 3, // the previous result played again
};

export type Scorer = (ticket: number[]) => number;

// Popularity relative to the average ticket (1 = average).
export function createScorer(pool: Pool, cols: number, last: number[] = []): Scorer {
  const W = WEIGHTS;
  const { size: n, pick: k } = pool;
  const measure = createMeter(n, cols);
  const m = new Array<number>(15);
  const lastSet = new Set(last);
  const raw = (a: number[]) => {
    measure(a, m);
    let s = 0; let fromLast = 0;
    for (const x of a) {
      s += x <= 31 ? W.birthday : W.high;
      if (x <= 12) s += W.month;
      if (x === 7) s += W.seven; else if (x % 7 === 0) s += W.multipleOf7;
      if (lastSet.has(x)) fromLast++;
    }
    if (a[k - 1] <= 31) s += W.allBirthdays;
    const line = Math.max(m[7], m[8]);
    s += Math.max(
      m[3] === k ? W.fullRun : W.run * Math.max(0, m[3] - 2),
      m[4] === k ? W.fullProgression : W.progression * Math.max(0, m[4] - 3),
      line >= Math.min(k, cols) ? W.fullLine : W.line * Math.max(0, line - 3),
    );
    return s + (fromLast === k ? W.allLastDraw : W.lastDraw * fromLast);
  };
  // Normalise so that the average ticket has popularity 1 (fixed-seed Monte Carlo over random tickets).
  let x = 12345;
  const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  let sum = 0; const N = 20000;
  for (let i = 0; i < N; i++) {
    const s = new Set<number>();
    while (s.size < k) s.add(1 + Math.floor(rnd() * n));
    sum += Math.exp(raw([...s].sort((p, q) => p - q)));
  }
  const norm = sum / N;
  return (a) => Math.exp(raw(a)) / norm;
}
