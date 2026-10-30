// Settings: language, app updates and data.
import { t, LANGUAGES } from '../js/i18n.js';
import { state, subscribe } from '../js/store.js';
import { appUpdateSection } from '../js/update.js';
import { el, card, hint, select } from '../js/ui.js';
import { setLanguage } from '../js/app.js';

export function renderSettings(root) {
  const update = appUpdateSection();
  const off = subscribe((e) => { if (!update.node.isConnected) off(); else if (e.type === 'appUpdate') update.draw(); });
  root.append(
    el('h1', {}, t('nav.settings')),
    card(t('settings.language'),
      select(state.settings.language || 'pl', LANGUAGES.map((l) => [l, t(`language.${l}`)]), (v) => setLanguage(v)),
      hint(t('settings.languageHint'))),
    card(t('settings.appUpdate'), update.node, hint(t('settings.appUpdateHint'))),
    card(t('settings.data'), hint(t('settings.dataHint'))),
  );
}
