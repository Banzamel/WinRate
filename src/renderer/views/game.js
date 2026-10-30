// A game (Lotto or Eurojackpot): header with the next draw, and the sub-tabs.
import { t, date } from '../js/i18n.js';
import { state, loadHistory, subscribe } from '../js/store.js';
import { el, tabs, spinner } from '../js/ui.js';
import { renderOverview } from './overview.js';
import { renderHistory } from './history.js';
import { renderStats } from './stats.js';
import { renderFilters } from './filters.js';
import { renderGenerator } from './generator.js';
import { renderSimulation } from './simulation.js';

const TABS = { overview: renderOverview, history: renderHistory, stats: renderStats, filters: renderFilters, generator: renderGenerator, simulation: renderSimulation };

// Countdown to a draw: "2 d 04:13:09".
function countdown(iso) {
  const ms = Math.max(0, new Date(iso) - Date.now());
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0')).join(':');
  return d ? `${d} ${t('common.daysShort')} ${hms}` : hms;
}

export function renderGame(root, id) {
  const game = state.games[id];
  const next = game.nextDraws.find((d) => new Date(d) > Date.now()) || game.nextDraws[0];
  const timer = el('strong', {}, countdown(next));
  const tick = setInterval(() => { if (!timer.isConnected) clearInterval(tick); else timer.textContent = countdown(next); }, 1000);
  const body = el('div', { class: 'game-body' });
  const active = state.tab[id];
  root.append(
    el('div', { class: 'game-head' },
      el('div', {}, el('h1', {}, game.name), el('span', { class: 'muted' }, t(`game.${id}.tagline`))),
      el('div', { class: 'next-draw' }, el('span', { class: 'muted' }, t('game.nextDraw', { when: date(next, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: game.schedule.timeZone }) })), timer)),
    tabs(Object.keys(TABS), active, (tab) => { state.tab[id] = tab; root.replaceChildren(); renderGame(root, id); }),
    body,
  );
  body.append(spinner());
  loadHistory(id).then(() => {
    if (!body.isConnected) return;
    body.replaceChildren();
    TABS[active](body, id);
  });
}

// Runs a background job for a view; the view is re-rendered when it finishes (if still shown).
export async function runJob(lane, body, id, fn, rerender) {
  state.jobs[lane] = { progress: 0 };
  try {
    return await fn();
  } finally {
    delete state.jobs[lane];
    document.getElementById('job-status').replaceChildren();
    if (body.isConnected && rerender) { body.replaceChildren(); rerender(body, id); }
  }
}

export { subscribe };
