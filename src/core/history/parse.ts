// Parsing of results exports. Understood layouts (separators may vary):
//   "1. 27.01.1957 8,12,31,39,43,45"            (mbnet.com.pl)
//   "2024-01-02;3;11;19;27;41;44"                (CSV)
//   "6170. 29.10.2024 2,14,27,33,48,1,9"         (Eurojackpot: 5 main numbers, then 2 euro numbers)
//   ";2026-10-27;;11,33,38,42,47;11,12;;"        (mbnet.com.pl/bazy/*.csv: number;date;time;main;extra;…)
import { eraOf, type Draw, type Game } from '../games';
import { validateDraw } from './validate';

const DATE_RE = /(\d{4})-(\d{2})-(\d{2})|(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
const pad = (n: string) => n.padStart(2, '0');

export function parseLine(game: Game, line: string): Draw | null {
  const m = line.match(DATE_RE);
  if (!m || m.index === undefined) return null;
  const date = m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${pad(m[5])}-${pad(m[4])}`;
  const nums = (line.slice(m.index + m[0].length).match(/\d+/g) || []).map(Number);
  const era = eraOf(game, date);
  if (nums.length < era.pools.reduce((s, p) => s + p.pick, 0)) return null;
  let at = 0;
  const pools = era.pools.map((p) => {
    const part = nums.slice(at, at + p.pick).sort((a, b) => a - b);
    at += p.pick;
    return part;
  });
  const draw = { date, pools };
  return validateDraw(game, draw) ? null : draw;
}

export function parseText(game: Game, text: string): { draws: Draw[]; skipped: number } {
  const draws: Draw[] = [];
  let skipped = 0;
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const d = parseLine(game, line);
    if (d) draws.push(d); else skipped++;
  }
  return { draws, skipped };
}

// One line of an export the app writes (and parseLine reads back).
export const formatLine = (draw: Draw): string => [draw.date, ...draw.pools.flat()].join(';');
