// Game rules. Prices and fixed prizes are the Polish (Totalizator Sportowy) ones; check lotto.pl
// when they change.
import type { Game } from './types';

const lotto: Game = {
  id: 'lotto',
  name: 'Lotto',
  operator: 'Totalizator Sportowy',
  pools: [{ key: 'main', size: 49, pick: 6 }],
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
  slipColumns: 7,
  typicalPrizes: { 5: 7500, 4: 200 },
  typicalJackpot: 15000000,
  typicalSales: 8000000,
  // mbnet.com.pl result databases; the old plain-text dl.txt stays as a fallback.
  sources: ['https://www.mbnet.com.pl/bazy/lotto.csv', 'https://www.mbnet.com.pl/dl.txt'],
};

const eurojackpot: Game = {
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
  // The old ej.txt is gone (404 since the mbnet.com.pl redesign).
  sources: ['https://www.mbnet.com.pl/bazy/eurojackpot.csv'],
};

export const GAMES: Record<string, Game> = { lotto, eurojackpot };

export function getGame(id: string): Game {
  const game = GAMES[id];
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
