import type { Draw } from '../../../core/games';
import type { Report } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Balls, Card, CompareBars, FitBadge, Hint } from '../../../shared/ui';

// Numbers repeated from the previous draw, and results that came out more than once.
export function RepeatsCards({ report, era }: { report: Report; era: Draw[] }) {
  const { t, num, pct, date } = useI18n();
  const { repeats, repeatedDraws, draws, combinations } = report;
  const chance = 1 - Math.exp(-(draws * (draws - 1)) / 2 / combinations);
  return (
    <div className="grid-2">
      <Card title={t('stats.repeats')}>
        <CompareBars rows={repeats.observed.map((o, h) => ({ label: t('stats.repeatN', { n: h }), observed: o, expected: repeats.expected[h] }))} />
        <FitBadge fit={repeats.fit} />
        <Hint text={t('stats.repeatsHint')} />
      </Card>
      <Card title={t('stats.sameDraws')}>
        {repeatedDraws.length
          ? <div className="draw-list">{repeatedDraws.map((r, i) => <div className="draw-row" key={i}><Balls pools={[r.numbers]} /><span className="muted">{r.at.map((j) => date(era[j].date)).join(', ')}</span></div>)}</div>
          : <p>{t('stats.noSameDraws')}</p>}
        <Hint text={t('stats.sameDrawsHint', { combos: num(combinations), draws: num(draws), chance: pct(chance, 2) })} />
      </Card>
    </div>
  );
}
