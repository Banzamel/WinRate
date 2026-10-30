// Draw history: parsing text exports, validation against the rule era, and the JSON store.
// A draw is { date: 'YYYY-MM-DD', pools: [[main numbers], [euro numbers]?] }, numbers sorted.
const fs = require('fs');
const path = require('path');
const { eraOf } = require('./games');

const DATE_RE = /(\d{4})-(\d{2})-(\d{2})|(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
const pad = (n) => String(n).padStart(2, '0');

// Checks a draw against the rules of its date; returns an error message or null.
function validateDraw(game, draw) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draw.date || '')) return 'date';
  const era = eraOf(game, draw.date);
  if (!Array.isArray(draw.pools) || draw.pools.length !== era.pools.length) return 'pools';
  for (let i = 0; i < era.pools.length; i++) {
    const nums = draw.pools[i];
    const { size, pick } = era.pools[i];
    if (nums.length !== pick) return 'count';
    if (new Set(nums).size !== pick) return 'duplicate';
    if (nums.some((x) => !Number.isInteger(x) || x < 1 || x > size)) return 'range';
  }
  return null;
}

// Parses one line of a results export. Understood layouts (separators may vary):
//   "1. 27.01.1957 8,12,31,39,43,45"            (mbnet.com.pl)
//   "2024-01-02;3;11;19;27;41;44"                (CSV)
//   "6170. 29.10.2024 2,14,27,33,48,1,9"         (Eurojackpot: 5 main numbers, then 2 euro numbers)
//   ";2026-10-27;;11,33,38,42,47;11,12;;"        (mbnet.com.pl/bazy/*.csv: number;date;time;main;extra;…)
function parseLine(game, line) {
  const m = line.match(DATE_RE);
  if (!m) return null;
  const date = m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${pad(m[5])}-${pad(m[4])}`;
  const rest = line.slice(m.index + m[0].length);
  const nums = (rest.match(/\d+/g) || []).map(Number);
  const era = eraOf(game, date);
  const need = era.pools.reduce((s, p) => s + p.pick, 0);
  if (nums.length < need) return null;
  let at = 0;
  const pools = era.pools.map((p) => {
    const part = nums.slice(at, at + p.pick).sort((a, b) => a - b);
    at += p.pick;
    return part;
  });
  const draw = { date, pools };
  return validateDraw(game, draw) ? null : draw;
}

function parseText(game, text) {
  const draws = [];
  let skipped = 0;
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const d = parseLine(game, line);
    if (d) draws.push(d); else skipped++;
  }
  return { draws, skipped };
}

const sortDraws = (draws) => draws.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

// One JSON file per game. Draws are unique per date (both games draw at most once a day).
class HistoryStore {
  constructor(game, dir) {
    this.game = game;
    this.file = path.join(dir, `${game.id}.json`);
    this.draws = [];
    try { this.draws = sortDraws(JSON.parse(fs.readFileSync(this.file, 'utf8')).draws || []); } catch { /* empty store */ }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify({ game: this.game.id, updated: new Date().toISOString(), draws: this.draws }));
  }

  // Adds new draws; a draw for a date already stored replaces it only when `replace` is set.
  merge(draws, { replace = false } = {}) {
    const byDate = new Map(this.draws.map((d) => [d.date, d]));
    let added = 0; let changed = 0;
    for (const d of draws) {
      if (validateDraw(this.game, d)) continue;
      const old = byDate.get(d.date);
      if (!old) { byDate.set(d.date, d); added++; } else if (replace && JSON.stringify(old.pools) !== JSON.stringify(d.pools)) { byDate.set(d.date, d); changed++; }
    }
    this.draws = sortDraws([...byDate.values()]);
    if (added || changed) this.save();
    return { added, changed, total: this.draws.length };
  }

  remove(date) {
    const before = this.draws.length;
    this.draws = this.draws.filter((d) => d.date !== date);
    if (this.draws.length !== before) this.save();
    return this.draws.length !== before;
  }

  list() { return this.draws; }
}

// Downloads the full history from the game's sources (first one that answers wins).
async function download(game, fetchImpl = fetch) {
  const errors = [];
  for (const url of game.sources) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { draws, skipped } = parseText(game, await res.text());
      if (!draws.length) throw new Error('no draws in the response');
      return { url, draws, skipped };
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  throw new Error(errors.join('; '));
}

// Draws played under the current rules only (pool sizes must match for the statistics).
function currentEraDraws(game, draws) {
  const from = game.eras[game.eras.length - 1].from;
  return draws.filter((d) => d.date >= from);
}

module.exports = { parseLine, parseText, validateDraw, HistoryStore, download, currentEraDraws, sortDraws };
