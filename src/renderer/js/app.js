// Renderer entry: boot, navigation, title bar and background job progress.
import { loadLanguage, t, translateDom } from './i18n.js';
import { state, subscribe, emit } from './store.js';
import { el } from './ui.js';
import { renderGame } from '../views/game.js';
import { renderSettings } from '../views/settings.js';
import { renderAbout } from '../views/about.js';

const NAV = ['lotto', 'eurojackpot', 'about', 'settings'];
const ICONS = {
  lotto: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor" font-weight="700">6</text>',
  eurojackpot: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  about: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7"/>',
  settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
};
const icon = (name) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = ICONS[name]; return s; };

export function navigate(view) {
  state.view = view;
  render();
}

export function render() {
  const view = document.getElementById('view');
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
  view.replaceChildren();
  if (state.games[state.view]) renderGame(view, state.view);
  else if (state.view === 'settings') renderSettings(view);
  else renderAbout(view);
}

function renderNav() {
  document.getElementById('nav').replaceChildren(
    ...NAV.map((name) => el('button', { class: 'nav-btn', 'data-view': name, onClick: () => navigate(name) },
      icon(name), el('span', {}, state.games[name] ? state.games[name].name : t(`nav.${name}`)))),
    el('div', { class: 'nav-foot' }, `v${state.version}`),
  );
}

function renderJobs() {
  const running = Object.entries(state.jobs).filter(([, j]) => j && j.progress < 1);
  document.getElementById('job-status').replaceChildren(...running.map(([lane, j]) => el('span', { class: 'job-pill' }, `${t(`lane.${lane}`)} ${Math.round(j.progress * 100)}%`)));
}

export async function setLanguage(lang) {
  state.settings = await window.api.setSettings({ language: lang });
  await loadLanguage(lang);
  translateDom();
  renderNav();
  render();
}

async function boot() {
  const init = await window.api.init();
  state.settings = init.settings;
  state.version = init.version;
  state.games = Object.fromEntries(init.games.map((g) => [g.id, g]));
  state.filters = init.filters;
  state.strategies = init.strategies;
  await loadLanguage(state.settings.language || 'pl');
  translateDom();
  document.querySelectorAll('[data-win]').forEach((b) => b.addEventListener('click', () => window.api.window(b.dataset.win)));
  window.api.onProgress((p) => { state.jobs[p.lane] = p; renderJobs(); emit({ type: 'progress', ...p }); });
  subscribe((e) => { if (e.type === 'done') { delete state.jobs[e.lane]; renderJobs(); } });
  renderNav();
  render();
}

boot();
