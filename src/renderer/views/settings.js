// Settings: language, app updates and data.
import { t, LANGUAGES } from '../js/i18n.js';
import { state, subscribe } from '../js/store.js';
import { appUpdateSection } from '../js/update.js';
import { el, card, hint, select, mount } from '../js/ui.js';
import { setLanguage } from '../js/app.js';

export function renderSettings(root) {
  const update = appUpdateSection();
  const off = subscribe((e) => { if (!update.node.isConnected) off(); else if (e.type === 'appUpdate') update.draw(); });
  mount(root, 
    el('h1', {}, t('nav.settings')),
    card(t('settings.language'),
      select(state.settings.language || 'pl', LANGUAGES.map((l) => [l, t(`language.${l}`)]), (v) => setLanguage(v)),
      hint(t('settings.languageHint'))),
    card(t('settings.mode'),
      el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: state.settings.advanced || null, onChange: async (e) => { state.settings = await window.api.setSettings({ advanced: e.target.checked }); } }), t('settings.advanced')),
      hint(t('settings.advancedHint'))),
    card(t('settings.appUpdate'), update.node, hint(t('settings.appUpdateHint'))),
    card(t('settings.data'),
      el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: state.settings.autoHistory !== false || null, onChange: async (e) => { state.settings = await window.api.setSettings({ autoHistory: e.target.checked }); } }), t('settings.autoHistory')),
      hint(t('settings.dataHint'))),
  );
}
