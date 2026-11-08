// Physical bias of the draw machine and balls — the only thing that could ever make some numbers
// more likely: a persistent excess of a number, a change of frequency over time, or memory between
// draws. When nothing is found the estimates fall back to the fair values, so using them can never hurt.
import { drift } from './drift';
import { memory, runsTest } from './memory';
import { posterior } from './posterior';
import type { BiasAnalysis } from './types';

// Everything for one pool, plus the best edge physically available: the jackpot chance of a ticket
// made of the most likely numbers relative to a fair ticket (independent-inclusion estimate).
export function analyze(size: number, pick: number, draws: number[][], opts: { halfLife?: number } = {}): BiasAnalysis {
  const post = posterior(size, pick, draws, opts);
  const top = [...post.numbers].sort((a, b) => b.p - a.p).slice(0, pick);
  return {
    posterior: post,
    best: { numbers: top.map((x) => x.n).sort((a, b) => a - b), edge: top.reduce((m, x) => m * (x.p / post.p0), 1) },
    drift: drift(size, draws),
    memory: memory(size, pick, draws),
    runs: runsTest(draws.map((d) => d.reduce((s, x) => s + x, 0))),
  };
}
