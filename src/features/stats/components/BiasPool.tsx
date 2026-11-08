import type { BiasAnalysis } from '../../../core/bias';
import type { Draw } from '../../../core/games';
import { useI18n } from '../../../shared/i18n';
import { Ball, PBadge, Table } from '../../../shared/ui';

// The machine tests of one pool: ball differences, changes over time, memory, clustering.
export function BiasPool({ bias, extra, era, title }: { bias: BiasAnalysis; extra: boolean; era: Draw[]; title: string | null }) {
  const { t, num, pct, date } = useI18n();
  const post = bias.posterior;
  const top = [...post.numbers].sort((x, y) => y.observed - x.observed).slice(0, 6);
  const minMem = bias.memory.reduce((m, l) => (l.p < m.p ? l : m), bias.memory[0]);
  return (
    <div className="bias-pool">
      {title ? <h3>{title}</h3> : null}
      <div className="verdicts">
        <div className="verdict"><span>{t('bias.balls')}</span><span className={`fit ${post.shrink > 0.2 ? 'warn' : 'good'}`}>{t('bias.signal', { pct: pct(post.shrink, 0) })}</span></div>
        <div className="verdict"><span>{t('bias.drift')}</span><PBadge p={bias.drift.overall} /></div>
        {minMem ? <div className="verdict"><span>{t('bias.memory', { lag: minMem.lag })}</span><PBadge p={Math.min(1, minMem.p * bias.memory.length)} /></div> : null}
        {bias.runs ? <div className="verdict"><span>{t('bias.runs')}</span><PBadge p={bias.runs.p} /></div> : null}
      </div>
      <div className="grid-2">
        <div>
          <h3>{t('bias.estimate')}</h3>
          <Table header={[t('stats.number'), t('bias.observed'), t('bias.estimated'), t('bias.edge')]}
            rows={top.map((x) => [<Ball n={x.n} small extra={extra} />, pct(x.observed, 2), pct(x.p, 2), `${x.edge >= 0 ? '+' : ''}${pct(x.edge, 2)}`])} />
          <p className={bias.best.edge > 1.05 ? 'warn' : ''}>{t('bias.bestTicket', { edge: num(bias.best.edge, 3) })}</p>
        </div>
        <div>
          <h3>{t('bias.changes')}</h3>
          <Table header={[t('stats.number'), t('bias.since'), t('bias.before'), t('bias.after'), 'p']}
            rows={bias.drift.numbers.slice(0, 6).map((x) => [<Ball n={x.n} small extra={extra} />, era[x.at] ? date(era[x.at].date) : '–', pct(x.before, 1), x.after === null ? '–' : pct(x.after, 1), num(x.p, 3)])} />
        </div>
      </div>
    </div>
  );
}
