import { useI18n } from '../i18n';

export const pTone = (p: number): 'bad' | 'warn' | 'good' => (p < 0.01 ? 'bad' : p < 0.05 ? 'warn' : 'good');

// A p-value in words: like chance (green), borderline, or unlikely by chance.
export function PBadge({ p, title }: { p: number; title?: string }) {
  const { t, num } = useI18n();
  const tone = pTone(p);
  const value = p < 0.0001 ? `< ${num(0.0001, 4)}` : `= ${num(p, 4)}`;
  return <span className={`fit ${tone}`} title={title}>{`p ${value} · ${t(`stats.fit.${tone}`)}`}</span>;
}
