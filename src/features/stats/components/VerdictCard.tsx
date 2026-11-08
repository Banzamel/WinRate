import { useAdvanced } from '../../../app/hooks';
import type { Fit, Report } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Card, FitBadge, Hint } from '../../../shared/ui';

const VerdictRow = ({ label, fit }: { label: string; fit: Fit }) => <div className="verdict"><span>{label}</span><FitBadge fit={fit} /></div>;

// Is the draw fair? Every test in one list (patterns only in advanced mode).
export function VerdictCard({ report }: { report: Report }) {
  const { t, num, date } = useI18n();
  const advanced = useAdvanced();
  return (
    <Card title={t('stats.verdict')}>
      <p className="muted">{t('stats.verdictShort', { draws: num(report.draws), from: date(report.from || ''), to: date(report.to || '') })}</p>
      <div className="verdicts">
        <VerdictRow label={t('stats.v.numbers')} fit={report.pools[0].fit} />
        {report.pools[1] ? <VerdictRow label={t('stats.v.extra')} fit={report.pools[1].fit} /> : null}
        <VerdictRow label={t('stats.v.pairs')} fit={report.pairs.fit} />
        <VerdictRow label={t('stats.v.repeats')} fit={report.repeats.fit} />
        {advanced && report.patterns ? Object.entries(report.patterns).map(([metric, p]) => <VerdictRow key={metric} label={t(`metric.${metric}`)} fit={p.fit} />) : null}
      </div>
      <Hint text={t('stats.verdictHint')} />
    </Card>
  );
}
