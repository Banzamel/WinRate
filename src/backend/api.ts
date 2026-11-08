// The app's backend, in the web view's main thread: settings, draw history stores, the worker
// lanes and the update check. It plays the part the Electron main process had; the views call it
// the way they called window.api before.
import { GAMES, getGame, currentEra, tierOdds, combinationCount, anyPrizeProbability, nextDraws, lastDraw, drawsPerYear } from '../engine/games.js';
import { HistoryStore, parseText, download, validateDraw } from '../engine/history.js';
import { defaultFilters, filterValues, resolveFilters, FILTERS } from '../engine/filters.js';
import { STRATEGIES } from '../engine/simulate.js';
import { platform } from './platform';
import { loadSettings, getSettings, setSettings, setGameSettings, gameSettingsOf } from './settings';
import { Jobs, type Progress } from './jobs';
import { fixedKey, sha1 } from './fixed-key';
import { createUpdater } from './updater';
import type { AppUpdate, Draw, FilterDef, GameInfo, HistoryAuto, MergeResult, Settings } from '../types';

declare const __APP_VERSION__: string;
export const VERSION = __APP_VERSION__;

// Tiny event hubs for what the main process used to push to the window.
function hub<T>() {
  const fns = new Set<(v: T) => void>();
  return { on: (fn: (v: T) => void) => { fns.add(fn); return () => { fns.delete(fn); }; }, emit: (v: T) => fns.forEach((fn) => fn(v)) };
}
const progressHub = hub<Progress>();
const historyHub = hub<HistoryAuto>();
const updateHub = hub<AppUpdate>();

// Draw history: one store per game, persisted as data/history/<game>.json.
const historyIo = {
  read: (name: string) => platform.readText(`history/${name}`),
  write: (name: string, text: string) => platform.writeText(`history/${name}`, text),
};
const stores: Record<string, any> = {};

// Census of the fixed filters: data/combinations/<game>-<sha1>.bin (one bit per combination,
// Lotto 1.7 MB) + .json meta, reused across starts. Kept in memory too while the settings stay.
const fixedMemory = new Map<string, unknown>();
const fixedFile = (key: string) => `combinations/${key.split(':')[0]}-${sha1(key).slice(0, 16)}`;

async function loadFixed(gameId: string, config: Record<string, unknown> | null) {
  if (!config) return null;
  const key = fixedKey(gameId, config);
  if (fixedMemory.has(key)) return fixedMemory.get(key);
  try {
    const [metaText, allowed] = await Promise.all([platform.readText(`${fixedFile(key)}.bin.json`), platform.readBytes(`${fixedFile(key)}.bin`)]);
    if (!metaText || !allowed) return null;
    const meta = JSON.parse(metaText);
    if (meta.key !== key) return null;
    const result = { ...meta, allowed };
    fixedMemory.set(key, result);
    return result;
  } catch {
    return null;
  }
}

async function saveFixed(fixed: any) {
  const { allowed, ...meta } = fixed;
  if (fixedMemory.size > 4) fixedMemory.delete(fixedMemory.keys().next().value as string);
  fixedMemory.set(meta.key, fixed);
  try {
    await platform.writeBytes(`${fixedFile(meta.key)}.bin`, allowed);
    await platform.writeText(`${fixedFile(meta.key)}.bin.json`, JSON.stringify(meta));
  } catch { /* the cache is optional */ }
}

const jobs = new Jobs((p) => progressHub.emit(p), (fixed) => { saveFixed(fixed); });

let updater: ReturnType<typeof createUpdater> | null = null;

// Static description of a game for the views.
function gameInfo(id: string): GameInfo {
  const game: any = getGame(id);
  const era = currentEra(game);
  return {
    id: game.id, name: game.name, operator: game.operator, pools: era.pools.map((p: any, i: number) => ({ ...game.pools[i], ...p })),
    eras: game.eras, schedule: game.schedule, price: game.price, slipColumns: game.slipColumns,
    tiers: tierOdds(game), combinations: combinationCount(game), anyPrize: anyPrizeProbability(game),
    nextDraws: nextDraws(game, new Date(), 4).map((d: Date) => d.toISOString()), drawsPerYear: drawsPerYear(game),
    defaultFilters: defaultFilters(era.pools[0]), filterValues: filterValues(era.pools[0]), sources: game.sources,
    typicalPrizes: game.typicalPrizes, system: game.system || null, typicalJackpot: game.typicalJackpot, typicalSales: game.typicalSales,
  };
}

// The filters switched on, always with their fixed values.
const configFor = (id: string, saved = gameSettingsOf(id).filters) => resolveFilters(currentEra(getGame(id)).pools[0], saved);

// Expected pattern distributions depend on the pool only: computed once, then read from disk.
const distCache: Record<string, unknown> = {};
async function distributionsFor(id: string) {
  if (distCache[id]) return distCache[id];
  const file = `cache/${id}-distributions-v2.json`;
  try { const text = await platform.readText(file); if (text) { distCache[id] = JSON.parse(text); return distCache[id]; } } catch { /* not computed yet */ }
  distCache[id] = await jobs.run('stats', 'distributions', { game: id });
  await platform.writeText(file, JSON.stringify(distCache[id]));
  return distCache[id];
}

// Local date (YYYY-MM-DD) of an instant in the game's time zone.
const localDate = (game: any, at: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: game.schedule.timeZone }).format(at);
const fetchImpl = ((u: string, o?: RequestInit) => platform.fetch(u, o)) as typeof fetch;
const draws = (id: string): Draw[] => stores[id].list();
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const api = {
  async init() {
    const settings = await loadSettings();
    for (const game of Object.values(GAMES) as any[]) {
      const store = await HistoryStore.open(game, historyIo);
      // History shipped with the installer seeds an empty store.
      if (!store.list().length) {
        const bundled = await platform.bundledHistory(game.id);
        if (bundled) await store.merge(parseText(game, bundled).draws);
      }
      stores[game.id] = store;
    }
    updater = createUpdater(VERSION, (u) => updateHub.emit(u));
    return {
      settings,
      version: VERSION,
      games: Object.keys(GAMES).map(gameInfo),
      filters: FILTERS.map((f: any) => ({ id: f.id, kind: f.kind })) as FilterDef[],
      strategies: STRATEGIES as string[],
      appUpdate: updater.status(),
    };
  },

  // At start: every game whose newest stored draw is older than its latest draw gets the new results
  // downloaded. Results are published a while after the draw; until then the next start tries again.
  // A store written by an older version (one draw per date) is downloaded again once.
  async refreshHistories() {
    for (const game of Object.values(GAMES) as any[]) {
      const store = stores[game.id];
      const list: Draw[] = store.list();
      const last = lastDraw(game);
      if (!store.outdated && list.length && last && list[list.length - 1].date >= localDate(game, last)) continue;
      historyHub.emit({ game: game.id, state: 'downloading' });
      try {
        const { draws: fresh } = await download(game, fetchImpl);
        const res = await store.merge(fresh, { replace: true });
        if (store.outdated) await store.save(); // nothing was missing: still mark the store as up to date
        historyHub.emit({ game: game.id, state: 'done', ...res });
      } catch (e) {
        historyHub.emit({ game: game.id, state: 'error', error: errorText(e) });
      }
    }
  },

  gameInfo,
  setSettings: (patch: Partial<Settings>) => setSettings(patch),
  setGameSettings: (id: string, patch: Record<string, unknown>) => setGameSettings(id, patch),
  getSettings,

  // History
  listHistory: async (id: string): Promise<Draw[]> => draws(id),
  async addDraw(id: string, draw: Draw): Promise<MergeResult> {
    const error = validateDraw(getGame(id), draw);
    if (error) return { added: 0, changed: 0, total: draws(id).length, error };
    return stores[id].merge([draw], { replace: true });
  },
  removeDraw: (id: string, date: string, pools?: number[][]): Promise<boolean> => stores[id].remove(date, pools),
  async downloadHistory(id: string): Promise<MergeResult> {
    try {
      const { url, draws: fresh, skipped } = await download(getGame(id), fetchImpl);
      return { url, skipped, ...(await stores[id].merge(fresh, { replace: true })) };
    } catch (e) {
      return { added: 0, changed: 0, total: draws(id).length, error: errorText(e) };
    }
  },
  async importHistory(id: string): Promise<MergeResult | null> {
    const picked = await platform.importFile();
    if (!picked) return null;
    const { draws: parsed, skipped } = parseText(getGame(id), picked.text);
    return { file: picked.file, skipped, ...(await stores[id].merge(parsed, { replace: true })) };
  },
  async exportHistory(id: string) {
    const lines = draws(id).map((d) => [d.date, ...d.pools.flat()].join(';'));
    const file = await platform.exportFile(`${id}-history.csv`, `${lines.join('\n')}\n`);
    return file ? { file, count: lines.length } : null;
  },

  // Analysis (each lane runs in its own worker)
  async report(id: string, opts: { recent?: number; halfLife?: number } = {}) {
    const dist = await distributionsFor(id);
    return jobs.run('stats', 'report', { game: id, draws: draws(id), dist, recent: opts.recent || 50, halfLife: opts.halfLife || 0 });
  },
  filters: (id: string, config?: Record<string, unknown>) => jobs.run('filters', 'filters', { game: id, draws: draws(id), config: configFor(id, config || undefined) }),
  async generate(id: string, opts: Record<string, unknown>) {
    const config = configFor(id);
    return jobs.run('generate', 'generate', { game: id, draws: draws(id), config, ...opts, fixedCache: await loadFixed(id, config) });
  },
  async backtest(id: string, opts: Record<string, unknown>) {
    const config = configFor(id);
    return jobs.run('sim', 'backtest', { game: id, draws: draws(id), config, ...opts, fixedCache: await loadFixed(id, config) });
  },
  async untilHit(id: string, opts: Record<string, unknown>) {
    const config = configFor(id);
    return jobs.run('sim', 'untilHit', { game: id, draws: draws(id), config, ...opts, fixedCache: await loadFixed(id, config) });
  },
  expectedValue: (id: string, opts: Record<string, unknown>) => jobs.run('ev', 'ev', { game: id, draws: draws(id), ...opts }),
  system: (id: string, opts: Record<string, unknown>) => jobs.run('generate', 'system', { game: id, draws: draws(id), config: configFor(id), ...opts }),
  checkTicket: (id: string, pools: number[][]) => jobs.run('ev', 'checkTicket', { game: id, draws: draws(id), config: configFor(id), pools }),
  wheel: (id: string, opts: Record<string, unknown>) => jobs.run('generate', 'wheel', { game: id, ...opts }),
  cancel: (lane: string) => jobs.cancel(lane),

  onProgress: progressHub.on,
  onHistoryAuto: historyHub.on,
  onAppUpdate: updateHub.on,
  checkAppUpdate: () => updater?.check(),
  downloadAppUpdate: () => updater?.download(),
  installAppUpdate: () => updater?.install(),

  window: platform.window,
  show: platform.show,
  confirm: platform.confirm,
  openExternal: (url: string) => { if (/^https:\/\//.test(url)) platform.openExternal(url); },
};
