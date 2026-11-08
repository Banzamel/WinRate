// Translation keys -> texts (src/lang/<code>.json, bundled); params are {name}.
// To add a language: add lang/<code>.json, import it below and add its code to LANGUAGES.
import pl from './lang/pl.json';
import en from './lang/en.json';

export const LANGUAGES = ['pl', 'en'];
const DICTS: Record<string, Record<string, string>> = { pl, en };
let dict: Record<string, string> = pl;
let current = 'pl';

export function setLanguage(lang: string) {
  current = DICTS[lang] ? lang : 'pl';
  dict = DICTS[current];
  document.documentElement.lang = current;
}

export const language = () => current;

export function t(key: string, params: Record<string, string | number> = {}): string {
  const text = dict[key] ?? en[key as keyof typeof en] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

// Number and date formatting in the UI language.
export const num = (n: number, digits = 0) => new Intl.NumberFormat(current, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
export const pct = (share: number, digits = 1) => `${num(share * 100, digits)} %`;
export const money = (amount: number, currency: string) => new Intl.NumberFormat(current, { style: 'currency', currency, maximumFractionDigits: amount >= 1000 ? 0 : 2 }).format(amount);
export const date = (iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) => new Intl.DateTimeFormat(current, opts).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
