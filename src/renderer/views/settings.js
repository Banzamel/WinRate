// Settings: language and data.
import { t, LANGUAGES } from '../js/i18n.js';
import { state } from '../js/store.js';
import { el, card, hint, select } from '../js/ui.js';
import { setLanguage } from '../js/app.js';

export function renderSettings(root) {
  root.append(
    el('h1', {}, t('nav.settings')),
    card(t('settings.language'),
      select(state.settings.language || 'pl', LANGUAGES.map((l) => [l, t(`language.${l}`)]), (v) => setLanguage(v)),
      hint(t('settings.languageHint'))),
    card(t('settings.data'), hint(t('settings.dataHint'))),
  );
}
