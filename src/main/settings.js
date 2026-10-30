// User settings persisted as JSON in the Electron userData folder.
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  language: 'pl',
  // Per game: active filters (null = defaults of the game), strategy and simulation options.
  games: {},
};

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.data = { ...DEFAULTS };
    try { this.data = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; } catch { /* first run */ }
  }

  get() { return this.data; }

  set(patch) {
    this.data = { ...this.data, ...patch };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    return this.data;
  }

  game(id) { return this.data.games[id] || {}; }

  setGame(id, patch) { return this.set({ games: { ...this.data.games, [id]: { ...this.game(id), ...patch } } }); }
}

module.exports = { Settings };
