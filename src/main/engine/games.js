// Game rules: number pools, rule eras, draw schedule, prize tiers and their exact odds.
// Prices and fixed prizes are the Polish (Totalizator Sportowy) ones; check lotto.pl when they change.
const { binom, matchProbability } = require('./combinatorics');

const GAMES = {
  lotto: {
    id: 'lotto',
    name: 'Lotto',
    operator: 'Totalizator Sportowy',
    // pools[0] is always the main pool; Eurojackpot adds a second, independent one.
    pools: [{ key: 'main', size: 49, pick: 6 }],
    // Rule eras: the pool sizes in force from a date on (history is checked against them).
    eras: [{ from: '1957-01-27', pools: [{ size: 49, pick: 6 }] }],
    schedule: { timeZone: 'Europe/Warsaw', weekdays: [2, 4, 6], time: '22:00' },
    // Since 18 August 2026 (before: 3 zł, and 24 zł for three hits).
    price: { amount: 5, currency: 'PLN' },
    // The 3-hit prize is fixed; the others are pari-mutuel (they depend on sales and winners).
    tiers: [
      { id: '6', hits: [6] },
      { id: '5', hits: [5] },
      { id: '4', hits: [4] },
      { id: '3', hits: [3], fixed: 35 },
    ],
    // System bets: 7 to 12 numbers on one bet = every 6-number combination of them.
    system: { min: 7, max: 12 },
    // Coupon layout: numbers fill rows of this many columns (used by the slip-pattern filters).
    slipColumns: 7,
    // Typical average pool prizes (PLN) for the expected-value calculator; editable in the app.
    typicalPrizes: { 5: 7500, 4: 200 },
    typicalJackpot: 15000000,
    typicalSales: 8000000,
    sources: ['http://www.mbnet.com.pl/dl.txt'],
  },
  eurojackpot: {
    id: 'eurojackpot',
    name: 'Eurojackpot',
    operator: 'Veikkaus (Helsinki) · Totalizator Sportowy in Poland',
    pools: [{ key: 'main', size: 50, pick: 5 }, { key: 'euro', size: 12, pick: 2 }],
    eras: [
      { from: '2012-03-23', pools: [{ size: 50, pick: 5 }, { size: 8, pick: 2 }] },
      { from: '2014-10-10', pools: [{ size: 50, pick: 5 }, { size: 10, pick: 2 }] },
      { from: '2022-03-25', pools: [{ size: 50, pick: 5 }, { size: 12, pick: 2 }] },
    ],
    // Draws are held in Helsinki on Tuesdays and Fridays between 20:00 and 21:00 Polish time.
    schedule: { timeZone: 'Europe/Warsaw', weekdays: [2, 5], time: '20:15' },
    price: { amount: 12.5, currency: 'PLN' },
    tiers: [
      { id: '5+2', hits: [5, 2] }, { id: '5+1', hits: [5, 1] }, { id: '5+0', hits: [5, 0] },
      { id: '4+2', hits: [4, 2] }, { id: '4+1', hits: [4, 1] }, { id: '3+2', hits: [3, 2] },
      { id: '4+0', hits: [4, 0] }, { id: '2+2', hits: [2, 2] }, { id: '3+1', hits: [3, 1] },
      { id: '3+0', hits: [3, 0] }, { id: '1+2', hits: [1, 2] }, { id: '2+1', hits: [2, 1] },
    ],
    slipColumns: 10,
    typicalPrizes: { '5+1': 2500000, '5+0': 500000, '4+2': 20000, '4+1': 1000, '3+2': 400, '4+0': 400, '2+2': 80, '3+1': 80, '3+0': 70, '1+2': 40, '2+1': 35 },
    typicalJackpot: 200000000,
    typicalSales: 60000000,
    sources: ['http://www.mbnet.com.pl/ej.txt'],
  },
};

const getGame = (id) => {
  const g = GAMES[id];
  if (!g) throw new Error(`Unknown game: ${id}`);
  return g;
};

// The rule era in force on a date (YYYY-MM-DD).
function eraOf(game, date) {
  let era = game.eras[0];
  for (const e of game.eras) if (date >= e.from) era = e;
  return era;
}
const currentEra = (game) => game.eras[game.eras.length - 1];

// Number of different tickets (the jackpot odds are 1 in this).
const combinationCount = (game) => game.pools.reduce((n, p) => n * binom(p.size, p.pick), 1);

// Exact probability of every prize tier for one ticket.
function tierOdds(game) {
  return game.tiers.map((tier) => {
    const p = tier.hits.reduce((acc, hit, i) => acc * matchProbability(game.pools[i].size, game.pools[i].pick, hit), 1);
    return { ...tier, probability: p, oneIn: 1 / p };
  });
}
const anyPrizeProbability = (game) => tierOdds(game).reduce((s, t) => s + t.probability, 0);

// Which tier a ticket wins against a draw (null: nothing). hits = matches per pool.
function tierFor(game, hits) {
  return game.tiers.find((t) => t.hits.every((h, i) => h === hits[i])) || null;
}

// Offset of a time zone from UTC (ms) at the given instant.
function zoneOffset(timeZone, date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The next `count` draw times (Date) at or after `from`.
function nextDraws(game, from = new Date(), count = 3) {
  const { timeZone, weekdays, time } = game.schedule;
  const [hh, mm] = time.split(':').map(Number);
  const out = [];
  for (let day = 0; out.length < count && day < 60; day++) {
    const probe = new Date(from.getTime() + day * 86400000);
    const local = new Date(probe.getTime() + zoneOffset(timeZone, probe));
    const y = local.getUTCFullYear(); const m = local.getUTCMonth(); const d = local.getUTCDate();
    if (!weekdays.includes(local.getUTCDay())) continue;
    const guess = Date.UTC(y, m, d, hh, mm);
    const at = new Date(guess - zoneOffset(timeZone, new Date(guess)));
    if (at >= from) out.push(at);
  }
  return out;
}

const drawsPerYear = (game) => game.schedule.weekdays.length * 52;

// The most recent draw time before `now` (Date).
function lastDraw(game, now = new Date()) {
  const draws = nextDraws(game, new Date(now.getTime() - 8 * 86400000), 6).filter((d) => d < now);
  return draws[draws.length - 1] || null;
}

module.exports = { GAMES, getGame, eraOf, currentEra, combinationCount, tierOdds, anyPrizeProbability, tierFor, nextDraws, lastDraw, drawsPerYear };
