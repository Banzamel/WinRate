import { useI18n } from '../../../shared/i18n';

// How many times as many players as average likely play the ticket.
export function PopularityPill({ value }: { value: number }) {
  const { t, num } = useI18n();
  const tone = value > 3 ? 'bad' : value < 0.7 ? 'good' : '';
  return <span className={`pop ${tone}`} title={t('generator.popularityTitle')}>{t('generator.popularity', { x: num(value, value < 10 ? 2 : 0) })}</span>;
}
