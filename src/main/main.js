// WinRate — Electron main process: window, app:// protocol, draw history and IPC.
const { app, BrowserWindow, ipcMain, protocol, net, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { Settings } = require('./settings');
const { Jobs } = require('./jobs');
const { GAMES, getGame, currentEra, tierOdds, combinationCount, anyPrizeProbability, nextDraws, drawsPerYear } = require('./engine/games');
const { HistoryStore, parseText, download, validateDraw } = require('./engine/history');
const { defaultFilters, FILTERS } = require('./engine/filters');
const { STRATEGIES } = require('./engine/simulate');
const { setupAppUpdater } = require('./app-updater');

// All data stays in one folder: <install folder>/data in the installed app (the uninstaller removes
// it), WINRATE_USERDATA=<dir> in development. Chromium caches and logs go there too.
const DATA_DIR = process.env.WINRATE_USERDATA || (app.isPackaged ? path.join(path.dirname(process.execPath), 'data') : null);
if (DATA_DIR) for (const key of ['userData', 'sessionData', 'logs', 'crashDumps']) app.setPath(key, key === 'userData' || key === 'sessionData' ? DATA_DIR : path.join(DATA_DIR, key));

// The install folder has to be writable (data never goes anywhere else).
function dataDirWritable() {
  if (!DATA_DIR) return true;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, '.write-test');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

const ROOT = path.join(__dirname, '..', '..');
const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
const BUNDLED_HISTORY = app.isPackaged ? path.join(process.resourcesPath, 'history') : path.join(ROOT, 'resources', 'history');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let win = null;
let settings = null;
let updater = null;
const stores = {};
const send = (channel, payload) => { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); };
const jobs = new Jobs((p) => send('job:progress', p));

// History shipped with the installer (fetched at build time) seeds an empty store.
function openStores() {
  const dir = path.join(app.getPath('userData'), 'history');
  for (const game of Object.values(GAMES)) {
    const store = new HistoryStore(game, dir);
    const bundled = path.join(BUNDLED_HISTORY, `${game.id}.txt`);
    if (!store.list().length && fs.existsSync(bundled)) store.merge(parseText(game, fs.readFileSync(bundled, 'utf8')).draws);
    stores[game.id] = store;
  }
}

// Static description of a game for the renderer.
function gameInfo(id) {
  const game = getGame(id);
  return {
    id: game.id, name: game.name, operator: game.operator, pools: currentEra(game).pools.map((p, i) => ({ ...game.pools[i], ...p })),
    eras: game.eras, schedule: game.schedule, price: game.price, slipColumns: game.slipColumns,
    tiers: tierOdds(game), combinations: combinationCount(game), anyPrize: anyPrizeProbability(game),
    nextDraws: nextDraws(game, new Date(), 4).map((d) => d.toISOString()), drawsPerYear: drawsPerYear(game),
    defaultFilters: defaultFilters(currentEra(game).pools[0]), sources: game.sources,
    typicalPrizes: game.typicalPrizes, typicalJackpot: game.typicalJackpot, typicalSales: game.typicalSales,
  };
}

const configFor = (id) => settings.game(id).filters || defaultFilters(currentEra(getGame(id)).pools[0]);

// Expected pattern distributions depend on the pool only: computed once, then read from disk.
const distCache = {};
async function distributionsFor(id) {
  if (distCache[id]) return distCache[id];
  const file = path.join(app.getPath('userData'), 'cache', `${id}-distributions-v1.json`);
  try { distCache[id] = JSON.parse(fs.readFileSync(file, 'utf8')); return distCache[id]; } catch { /* not computed yet */ }
  distCache[id] = await jobs.run('stats', 'distributions', { game: id });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(distCache[id]));
  return distCache[id];
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 880, minWidth: 1100, minHeight: 700,
    frame: false, backgroundColor: '#0b0f14', show: false,
    icon: path.join(ROOT, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { jobs.stopAll(); app.quit(); });
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) console.error(`[renderer] ${message} (${source}:${line})`);
  });
  win.loadURL('app://ui/index.html');
}

function registerIpc() {
  ipcMain.handle('app:init', () => ({
    settings: settings.get(),
    version: app.getVersion(),
    games: Object.keys(GAMES).map(gameInfo),
    filters: FILTERS.map((f) => ({ id: f.id, kind: f.kind })),
    strategies: STRATEGIES,
    appUpdate: updater.status(),
  }));
  ipcMain.handle('update:check', () => updater.check());
  ipcMain.handle('update:download', () => updater.download());
  ipcMain.handle('update:install', () => updater.install());
  ipcMain.handle('game:info', (_e, id) => gameInfo(id));
  ipcMain.handle('settings:set', (_e, patch) => settings.set(patch));
  ipcMain.handle('settings:setGame', (_e, id, patch) => settings.setGame(id, patch));

  // History
  ipcMain.handle('history:list', (_e, id) => stores[id].list());
  ipcMain.handle('history:add', (_e, id, draw) => {
    const error = validateDraw(getGame(id), draw);
    if (error) return { error };
    return stores[id].merge([draw], { replace: true });
  });
  ipcMain.handle('history:remove', (_e, id, date) => stores[id].remove(date));
  ipcMain.handle('history:download', async (_e, id) => {
    try {
      const { url, draws, skipped } = await download(getGame(id), (u, o) => net.fetch(u, o));
      return { url, skipped, ...stores[id].merge(draws, { replace: true }) };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle('history:import', async (_e, id) => {
    const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Text / CSV', extensions: ['txt', 'csv', 'tsv'] }, { name: '*', extensions: ['*'] }] });
    if (res.canceled || !res.filePaths.length) return null;
    const { draws, skipped } = parseText(getGame(id), fs.readFileSync(res.filePaths[0], 'utf8'));
    return { file: res.filePaths[0], skipped, ...stores[id].merge(draws, { replace: true }) };
  });
  ipcMain.handle('history:export', async (_e, id) => {
    const res = await dialog.showSaveDialog(win, { defaultPath: `${id}-history.csv`, filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (res.canceled || !res.filePath) return null;
    const lines = stores[id].list().map((d) => [d.date, ...d.pools.flat()].join(';'));
    fs.writeFileSync(res.filePath, `${lines.join('\n')}\n`);
    return { file: res.filePath, count: lines.length };
  });

  // Analysis (each lane runs in its own worker thread)
  const draws = (id) => stores[id].list();
  ipcMain.handle('engine:report', async (_e, id, opts = {}) => {
    const dist = await distributionsFor(id);
    return jobs.run('stats', 'report', { game: id, draws: draws(id), dist, recent: opts.recent || 50, halfLife: opts.halfLife || 0 });
  });
  ipcMain.handle('engine:filters', (_e, id, config) => jobs.run('filters', 'filters', { game: id, draws: draws(id), config: config || configFor(id) }));
  ipcMain.handle('engine:generate', (_e, id, opts) => jobs.run('generate', 'generate', { game: id, draws: draws(id), config: configFor(id), ...opts }));
  ipcMain.handle('engine:backtest', (_e, id, opts) => jobs.run('sim', 'backtest', { game: id, draws: draws(id), config: configFor(id), ...opts }));
  ipcMain.handle('engine:untilHit', (_e, id, opts) => jobs.run('sim', 'untilHit', { game: id, draws: draws(id), config: configFor(id), ...opts }));
  ipcMain.handle('engine:ev', (_e, id, opts) => jobs.run('ev', 'ev', { game: id, draws: draws(id), ...opts }));
  ipcMain.handle('engine:wheel', (_e, id, opts) => jobs.run('generate', 'wheel', { game: id, ...opts }));
  ipcMain.handle('job:cancel', (_e, lane) => jobs.cancel(lane));

  ipcMain.handle('win:action', (_e, action) => {
    if (!win) return;
    if (action === 'minimize') win.minimize();
    if (action === 'maximize') (win.isMaximized() ? win.unmaximize() : win.maximize());
    if (action === 'close') win.close();
  });
  ipcMain.handle('app:openExternal', (_e, url) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
  });
}

function serveFile(root, rel) {
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) return new Response('Forbidden', { status: 403 });
  return net.fetch(pathToFileURL(file).toString());
}

app.whenReady().then(() => {
  if (!dataDirWritable()) {
    dialog.showErrorBox('WinRate', `The app keeps its data in its own folder, but it cannot write to:\n${DATA_DIR}\n\nReinstall it into a folder you can write to (the default one is), or run it as administrator.\n\nAplikacja przechowuje dane we własnym folderze, ale nie może zapisywać w:\n${DATA_DIR}\n\nZainstaluj ją ponownie w folderze z prawem zapisu (domyślny je ma) lub uruchom jako administrator.`);
    app.quit();
    return;
  }
  settings = new Settings(app.getPath('userData'));
  openStores();
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (url.host === 'ui') return serveFile(RENDERER_DIR, rel);
    return new Response('Not found', { status: 404 });
  });
  updater = setupAppUpdater(send);
  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
