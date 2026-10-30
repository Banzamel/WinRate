// Renderer state shared by the views, and cached results per game.
export const state = {
  settings: null,
  version: '',
  games: {}, // id -> game info from the main process
  filters: [],
  strategies: [],
  view: 'lotto',
  tab: { lotto: 'overview', eurojackpot: 'overview' },
  history: {}, // id -> draws (oldest first)
  report: {}, // id -> statistics report
  filterResult: {}, // id -> census of the active filters
  tickets: {}, // id -> last generated tickets
  backtest: {}, // id -> last backtest
  untilHit: {}, // id -> last until-hit run
  jobs: {}, // lane -> { progress, info }
};

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const emit = (what) => listeners.forEach((fn) => fn(what));

// Advanced mode shows the scientific extras (physics, patterns, backtests…); off by default.
export const advanced = () => !!(state.settings && state.settings.advanced);

export const gameSettings = (id) => (state.settings.games && state.settings.games[id]) || {};
export const filtersOf = (id) => gameSettings(id).filters || state.games[id].defaultFilters;

export async function saveGameSettings(id, patch) {
  state.settings = await window.api.setGameSettings(id, patch);
}

export async function loadHistory(id, { force = false } = {}) {
  if (!state.history[id] || force) state.history[id] = await window.api.listHistory(id);
  return state.history[id];
}

// Results depending on the history are dropped when it changes.
export function historyChanged(id) {
  delete state.report[id];
  delete state.filterResult[id];
}
