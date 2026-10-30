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

// 2: several draws per date.
const STORE_FORMAT = 2;

const sortDraws = (draws) => draws.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

// One JSON file per game. A date can hold several draws (Lotto drew twice a day on many days of
// 1965–1991): draws of one date are told apart by their order, as in the source.
class HistoryStore {
  constructor(game, dir) {
    this.game = game;
    this.file = path.join(dir, `${game.id}.json`);
    this.draws = [];
    // Stores written before STORE_FORMAT 2 kept one draw per date: `outdated` asks for a full download.
    this.format = 0;
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.draws = sortDraws(saved.draws || []);
      this.format = saved.format || 1;
    } catch { /* empty store */ }
  }

  get outdated() { return this.draws.length > 0 && this.format < STORE_FORMAT; }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify({ game: this.game.id, format: STORE_FORMAT, updated: new Date().toISOString(), draws: this.draws }));
    this.format = STORE_FORMAT;
  }

  // Adds new draws. The n-th draw of a date is matched with the n-th stored draw of that date; a
  // stored one is replaced only when `replace` is set.
  merge(draws, { replace = false } = {}) {
    const byDate = new Map();
    for (const d of this.draws) { if (!byDate.has(d.date)) byDate.set(d.date, []); byDate.get(d.date).push(d); }
    const seen = new Map();
    let added = 0; let changed = 0;
    for (const d of draws) {
      if (validateDraw(this.game, d)) continue;
      const n = seen.get(d.date) || 0;
      seen.set(d.date, n + 1);
      if (!byDate.has(d.date)) byDate.set(d.date, []);
      const day = byDate.get(d.date);
      if (n >= day.length) { day.push(d); added++; } else if (replace && JSON.stringify(day[n].pools) !== JSON.stringify(d.pools)) { day[n] = d; changed++; }
    }
    this.draws = sortDraws([...byDate.values()].flat());
    if (added || changed) this.save();
    return { added, changed, total: this.draws.length };
  }

  // Removes the draw of a date with these numbers (all draws of the date when pools are not given).
  remove(date, pools) {
    const before = this.draws.length;
    const key = pools && JSON.stringify(pools);
    const i = key ? this.draws.findIndex((d) => d.date === date && JSON.stringify(d.pools) === key) : -1;
    this.draws = key ? this.draws.filter((_, j) => j !== i) : this.draws.filter((d) => d.date !== date);
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
