// Build step: downloads the full draw history of every game into resources/history/<game>.txt,
// so the installer ships with data and the app works offline from the first start.
// A source that cannot be reached only produces a warning: the app downloads it itself later.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES } from '../src/engine/games.js';
import { download } from '../src/engine/history.js';

// Bundled into the installer as a Tauri resource (src-tauri/tauri.conf.json: bundle.resources).
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'resources', 'history');

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
