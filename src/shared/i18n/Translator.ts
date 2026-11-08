// Translation keys -> texts (src/lang/<code>.json, bundled); params are {name}. Numbers and dates
// are formatted in the UI language. To add a language: add lang/<code>.json and list it below.
import en from '../../lang/en.json';
import pl from '../../lang/pl.json';

export const LANGUAGES = ['pl', 'en'];
const DICTS: Record<string, Record<string, string>> = { pl, en };
const FALLBACK: Record<string, string> = en;

export type Params = Record<string, string | number>;

export class Translator {
  readonly lang: string;
  private readonly dict: Record<string, string>;

  constructor(lang: string) {
    this.lang = DICTS[lang] ? lang : 'pl';
    this.dict = DICTS[this.lang];
  }

  t = (key: string, params: Params = {}): string => {
    const text = this.dict[key] ?? FALLBACK[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
  };

  num = (n: number, digits = 0): string =>
    new Intl.NumberFormat(this.lang, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);

  pct = (share: number, digits = 1): string => `${this.num(share * 100, digits)} %`;

  money = (amount: number, currency: string): string =>
    new Intl.NumberFormat(this.lang, { style: 'currency', currency, maximumFractionDigits: amount >= 1000 ? 0 : 2 }).format(amount);

  date = (iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string =>
    new Intl.DateTimeFormat(this.lang, opts).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));

  weekday = (day: number): string =>
    new Intl.DateTimeFormat(this.lang, { weekday: 'long' }).format(new Date(Date.UTC(2024, 0, 7 + day)));
}
