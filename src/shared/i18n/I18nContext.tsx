import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Translator } from './Translator';

const I18nContext = createContext<Translator>(new Translator('pl'));

export function I18nProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const translator = useMemo(() => new Translator(lang), [lang]);
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

export const useI18n = (): Translator => useContext(I18nContext);
