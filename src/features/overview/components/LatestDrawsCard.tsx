import { useAdvanced, useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Balls, Card, Stat } from '../../../shared/ui';
import type { GameInfo } from '../../game';

// The last eight results, how many are stored, and (advanced) the rule eras.
export function LatestDrawsCard({ game }: { game: GameInfo }) {
  const { t, num, date } = useI18n();
  const draws = useAppState((s) => s.history[game.id]);
  const advanced = useAdvanced();
  return (
    <Card title={t('overview.latest')}>
      {draws.length
        ? <div className="draw-list">{draws.slice(-8).reverse().map((d, i) => <div className="draw-row" key={i}><span className="muted">{date(d.date)}</span><Balls pools={d.pools} /></div>)}</div>
        : <p className="muted">{t('history.empty')}</p>}
      <div className="stats-row compact">
        <Stat label={t('overview.stored')} value={num(draws.length)} />
        {draws.length ? <Stat label={t('overview.range')} value={`${date(draws[0].date)} – ${date(draws[draws.length - 1].date)}`} /> : null}
      </div>
      {advanced ? (
        <>
          <h3>{t('overview.eras')}</h3>
          <ul className="plain">{game.eras.map((e) => <li key={e.from}>{`${date(e.from)}: ${e.pools.map((p) => `${p.pick}/${p.size}`).join(' + ')}`}</li>)}</ul>
        </>
      ) : null}
    </Card>
  );
}
