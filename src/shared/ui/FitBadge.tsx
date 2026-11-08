import type { Fit } from '../../core/stats';
import { useI18n } from '../i18n';
import { PBadge } from './PBadge';

// The verdict of a chi-square test.
export function FitBadge({ fit }: { fit?: Fit | null }) {
  const { t, num } = useI18n();
  if (!fit) return null;
  return <PBadge p={fit.p} title={t('stats.fitTitle', { chi2: num(fit.chi2, 1), df: fit.df })} />;
}
