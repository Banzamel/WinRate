// Entry: loads settings and history, wires the backend events into the store, renders the app.
import { createRoot } from 'react-dom/client';
import { api } from './backend/api';
import { setLanguage, t } from './i18n';
import { state, notify, toast, loadHistory, historyChanged } from './store';
import { App } from './App';
import './css/app.css';

async function boot() {
  const init = await api.init();
  state.settings = init.settings;
  state.version = init.version;
  state.games = Object.fromEntries(init.games.map((g) => [g.id, g]));
  state.filters = init.filters;
  state.strategies = init.strategies;
  state.appUpdate = init.appUpdate;
  setLanguage(state.settings.language || 'pl');

  api.onProgress((p) => { state.jobs[p.lane] = { progress: p.progress, info: p.info }; notify('jobs'); });
  api.onAppUpdate((u) => { state.appUpdate = u; notify(); });
  // Results downloaded automatically at start.
  api.onHistoryAuto(async (e) => {
    const name = state.games[e.game].name;
    state.historyAuto = { ...state.historyAuto, [e.game]: e };
    if (e.state === 'error') { toast(t('history.autoError', { game: name, error: e.error || '' }), 'bad'); return; }
    if (e.state !== 'done') return;
    if (e.added || e.changed) {
      toast(t('history.autoDone', { game: name, added: e.added || 0, total: e.total || 0 }), 'good');
      await loadHistory(e.game, { force: true });
      historyChanged(e.game);
    }
  });

  createRoot(document.getElementById('root')!).render(<App />);
  if (state.settings.autoHistory !== false) api.refreshHistories();
}

boot();
