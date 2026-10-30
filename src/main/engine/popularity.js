// How many other players are likely to play a ticket, and what that does to the payout.
// People do not pick at random: they play birthdays (1–31), months (1–12), lucky numbers, runs,
// progressions, lines on the coupon and the last result (Henze 1997; Henze & Riedwyl 1998;
// Crack & Whigham). A ticket that wins as often but is shared with fewer winners pays more.
// The weights below are estimates in log-units taken from those findings, not measured sales data.
const { createMeter } = require('./filters');

const W = {
  birthday: 0.12, // each number 1..31
  allBirthdays: 0.6, // every number 1..31
  month: 0.08, // each number 1..12
  seven: 0.15, // the number 7
  multipleOf7: 0.05,
  high: -0.04, // each number above 31 (chosen less)
  // Patterns do not add up: a ticket counts as its most striking pattern. A full run such as
  // 1-2-3-4-5-6 lands at a few thousand times the average ticket, as reported for 6/49 games.
  run: 0.8, // per number of a consecutive run beyond 2
  fullRun: 6.5, // 1-2-3-4-5-6 and alike
  progression: 0.7, // per number of an arithmetic progression beyond 3
  fullProgression: 5,
  line: 0.8, // per number in one coupon row or column beyond 3
  fullLine: 5,
  lastDraw: 0.3, // each number of the previous draw
  allLastDraw: 3, // the previous result played again
};

function createScorer(pool, cols, last = []) {
  const { size: n, pick: k } = pool;
  const measure = createMeter(n, cols);
  const m = new Array(15);
  const lastSet = new Set(last);
  const raw = (a) => {
    measure(a, m);
    let s = 0; let fromLast = 0;
    for (const x of a) {
      if (x <= 31) s += W.birthday; else s += W.high;
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
    s += fromLast === k ? W.allLastDraw : W.lastDraw * fromLast;
    return s;
  };
  // Normalise so that the average ticket has popularity 1 (Monte Carlo over random tickets).
  let x = 12345;
  const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  let sum = 0; const N = 20000;
  for (let i = 0; i < N; i++) {
    const s = new Set();
    while (s.size < k) s.add(1 + Math.floor(rnd() * n));
    sum += Math.exp(raw([...s].sort((p, q) => p - q)));
  }
  const norm = sum / N;
  return (a) => Math.exp(raw(a)) / norm;
}

// Expected share of the jackpot for one winning ticket when `sold` tickets are played and the
// ticket is `popularity` times as popular as average: other winners W ~ Poisson(λ), E[1/(1+W)].
function jackpotShare(popularity, sold, combinations) {
  const lambda = (popularity * sold) / combinations;
  return lambda < 1e-9 ? 1 : (1 - Math.exp(-lambda)) / lambda;
}

// Expected value of one ticket: the jackpot (shared with the expected number of other winners,
// after tax) plus every other tier — fixed prizes as published, pool prizes at the average amounts
// given in `prizes` ({ tierId: amount }). taxFree: prizes up to this amount are tax-free in Poland.
// Pool prizes of lower tiers are shared too, but among so many winners that popularity barely moves them.
function expectedValue(game, { jackpot, sold, popularity = 1, prizes = {}, tax = 0.1, taxFree = 2280 }) {
  const [top, ...rest] = game.tiers;
  const share = jackpotShare(popularity, sold, game.combinations);
  const net = (v) => (v > taxFree ? v * (1 - tax) : v);
  const jackpotEV = top.probability * net(jackpot * share);
  const tiers = rest.map((t) => ({ id: t.id, amount: t.fixed || prizes[t.id] || 0, ev: t.probability * net(t.fixed || prizes[t.id] || 0) }));
  const otherEV = tiers.reduce((s, t) => s + t.ev, 0);
  const total = jackpotEV + otherEV;
  // Jackpot at which the ticket pays back its price on average (ignoring rollovers' effect on sales).
  let breakEven = null;
  if (otherEV < game.price.amount) {
    let lo = 0; let hi = 1e12;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (top.probability * net(mid * share) + otherEV < game.price.amount) lo = mid; else hi = mid;
    }
    breakEven = hi < 1e12 ? hi : null;
  }
  return { share, jackpotEV, otherEV, tiers, total, price: game.price.amount, net: total - game.price.amount, returnRate: total / game.price.amount, breakEven };
}

module.exports = { WEIGHTS: W, createScorer, jackpotShare, expectedValue };
