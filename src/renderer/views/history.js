// History: download, import, export, manual entry and the list of all draws.
import { t, num, date } from '../js/i18n.js';
import { state, loadHistory, historyChanged } from '../js/store.js';
import { el, card, balls, toast, hint, mount } from '../js/ui.js';

const PAGE = 100;

export function renderHistory(body, id) {
  const game = state.games[id];
  const draws = state.history[id];
  let shown = PAGE;
  const list = el('div', { class: 'draw-list long' });
  const refresh = async (res, okKey) => {
    if (!res) return;
    if (res.error) { toast(t('history.error', { error: res.error }), 'bad'); return; }
    toast(t(okKey, { added: num(res.added || 0), changed: num(res.changed || 0), total: num(res.total || 0), skipped: num(res.skipped || 0) }), 'good');
    await loadHistory(id, { force: true });
    historyChanged(id);
    body.replaceChildren(); renderHistory(body, id);
  };
  const busy = (btn, fn) => async () => { btn.disabled = true; btn.classList.add('busy'); try { await fn(); } finally { btn.disabled = false; btn.classList.remove('busy'); } };

  const downloadBtn = el('button', { class: 'btn primary' }, t('history.download'));
  downloadBtn.addEventListener('click', busy(downloadBtn, async () => refresh(await window.api.downloadHistory(id), 'history.downloaded')));
  const importBtn = el('button', { class: 'btn' }, t('history.import'));
  importBtn.addEventListener('click', busy(importBtn, async () => refresh(await window.api.importHistory(id), 'history.imported')));
  const exportBtn = el('button', { class: 'btn' }, t('history.export'));
  exportBtn.addEventListener('click', async () => { const r = await window.api.exportHistory(id); if (r) toast(t('history.exported', { count: num(r.count) }), 'good'); });

  // Manual entry of one draw (e.g. tonight's result before the source updates).
  const dateInput = el('input', { type: 'date', value: new Date().toISOString().slice(0, 10) });
  const poolInputs = game.pools.map((p) => Array.from({ length: p.pick }, () => el('input', { type: 'number', class: 'num ball-input', min: 1, max: p.size })));
  const addBtn = el('button', { class: 'btn primary', onClick: async () => {
    const pools = poolInputs.map((inputs) => inputs.map((i) => Number(i.value)).sort((a, b) => a - b));
    const res = await window.api.addDraw(id, { date: dateInput.value, pools });
    if (res.error) toast(t(`history.invalid.${res.error}`), 'bad'); else refresh(res, 'history.added');
  } }, t('history.add'));

  const fill = () => {
    list.replaceChildren(...draws.slice(-shown).reverse().map((d) => el('div', { class: 'draw-row' },
      el('span', { class: 'muted' }, date(d.date)), balls(d.pools),
      el('button', { class: 'icon-btn', title: t('history.remove'), onClick: async () => {
        if (!confirm(t('history.removeConfirm', { date: date(d.date) }))) return;
        await window.api.removeDraw(id, d.date);
        refresh({ total: draws.length - 1 }, 'history.removed');
      } }, '✕'))));
    if (shown < draws.length) list.append(el('button', { class: 'btn ghost', onClick: () => { shown += PAGE * 5; fill(); } }, t('history.more', { n: num(draws.length - shown) })));
  };
  fill();

  mount(body, 
    el('div', { class: 'grid-2' },
      card(t('history.sources'),
        el('div', { class: 'btn-row' }, downloadBtn, importBtn, exportBtn),
        hint(t('history.sourcesHint', { urls: game.sources.join(', ') })),
        hint(t('history.formats'))),
      card(t('history.manual'),
        el('div', { class: 'manual' }, dateInput, poolInputs.map((inputs, i) => el('span', { class: `ball-inputs ${i ? 'extra' : ''}` }, inputs)), addBtn),
        hint(t('history.manualHint')))),
    card(t('history.all', { n: num(draws.length) }), draws.length ? list : el('p', { class: 'muted' }, t('history.empty'))),
  );
}
