// Build step: downloads the full draw history of every game into resources/history/<game>.txt,
// so the installer ships with data and the app works offline from the first start.
// A source that cannot be reached only produces a warning: the app downloads it itself later.
// The core is TypeScript, so it is loaded through Vite's module runner instead of plain Node.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Bundled into the installer as a Tauri resource (src-tauri/tauri.conf.json: bundle.resources).
const OUT = path.join(ROOT, 'resources', 'history');

const { module: games } = await runnerImport(path.join(ROOT, 'src/core/games/index.ts'));
const { module: history } = await runnerImport(path.join(ROOT, 'src/core/history/index.ts'));

fs.mkdirSync(OUT, { recursive: true });
for (const game of Object.values(games.GAMES)) {
  try {
    const { url, draws, skipped } = await history.download(game, (u, init) => fetch(u, init));
    fs.writeFileSync(path.join(OUT, `${game.id}.txt`), `${draws.map(history.formatLine).join('\n')}\n`);
    console.log(`✔ ${game.name}: ${draws.length} draws (${draws[0].date} – ${draws[draws.length - 1].date}) from ${url}${skipped ? `, ${skipped} lines skipped` : ''}`);
  } catch (e) {
    console.warn(`⚠ ${game.name}: history not bundled (${e.message})`);
  }
}
