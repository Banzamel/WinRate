// Translation keys -> texts. Language files live in ../lang/<code>.json; params are {name}.
// To add a language: add lang/<code>.json and its code to LANGUAGES.
export const LANGUAGES = ['pl', 'en'];
let dict = {};
let fallback = {};
let current = 'pl';

export async function loadLanguage(lang) {
  const load = async (code) => (await fetch(`lang/${code}.json`)).json();
  fallback = await load('en');
  dict = lang === 'en' ? fallback : await load(lang).catch(() => fallback);
  current = lang;
  document.documentElement.lang = lang;
}

export const language = () => current;

export function t(key, params = {}) {
  const text = dict[key] ?? fallback[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

// Fills static markup: data-i18n (text) and data-i18n-title (title attribute).
export function translateDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

// Number and date formatting in the UI language.
export const num = (n, digits = 0) => new Intl.NumberFormat(current, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
export const pct = (share, digits = 1) => `${num(share * 100, digits)} %`;
export const money = (amount, currency) => new Intl.NumberFormat(current, { style: 'currency', currency, maximumFractionDigits: amount >= 1000 ? 0 : 2 }).format(amount);
export const date = (iso, opts = { dateStyle: 'medium' }) => new Intl.DateTimeFormat(current, opts).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
