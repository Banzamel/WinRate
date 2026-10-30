// Build step: downloads the full draw history of every game into resources/history/<game>.txt,
// so the installer ships with data and the app works offline from the first start.
// A source that cannot be reached only produces a warning: the app downloads it itself later.
const fs = require('fs');
const path = require('path');
const { GAMES } = require('../src/main/engine/games');
const { download } = require('../src/main/engine/history');

const OUT = path.join(__dirname, '..', 'resources', 'history');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const game of Object.values(GAMES)) {
    try {
      const { url, draws, skipped } = await download(game);
      const lines = draws.map((d) => [d.date, ...d.pools.flat()].join(';'));
      fs.writeFileSync(path.join(OUT, `${game.id}.txt`), `${lines.join('\n')}\n`);
      console.log(`✔ ${game.name}: ${draws.length} draws (${draws[0].date} – ${draws[draws.length - 1].date}) from ${url}${skipped ? `, ${skipped} lines skipped` : ''}`);
    } catch (e) {
      console.warn(`⚠ ${game.name}: history not bundled (${e.message})`);
    }
  }
})();
