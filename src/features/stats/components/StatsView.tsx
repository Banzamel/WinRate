// Statistics: is the draw fair? Frequencies, hot/cold, gaps, pairs, patterns, repeats — each
// against the exact expectation of a fair draw, with a chi-square test.
import { useAdvanced, useAppState } from '../../../app/hooks';
import { eraDraws, getGame } from '../../../core/games';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint, NumberChart, Spinner } from '../../../shared/ui';
import { useStatsReport } from '../hooks/useStatsReport';
import { BiasCard } from './BiasCard';
import { GapsCard } from './GapsCard';
import { HotColdCard } from './HotColdCard';
import { NeighboursCard } from './NeighboursCard';
import { PairsCard } from './PairsCard';
import { PatternsCard } from './PatternsCard';
import { PhysicsCard } from './PhysicsCard';
import { RepeatsCards } from './RepeatsCards';
import { VerdictCard } from './VerdictCard';

export function StatsView({ id }: { id: string }) {
  const { t, num } = useI18n();
  const game = useAppState((s) => s.games[id]);
  const draws = useAppState((s) => s.history[id]);
  const advanced = useAdvanced();
  const { report, hasDraws, error, recent, setRecent } = useStatsReport(id);
  if (!hasDraws) return <Card><p className="muted">{t('history.emptyGo')}</p></Card>;
  if (error) return <Card><p className="bad">{error}</p></Card>;
  if (!report) return <Card><Spinner text={t('stats.computing')} /><Hint text={t('stats.firstTime')} /></Card>;
  const era = eraDraws(getGame(id), draws);
  return (
    <>
      <VerdictCard report={report} />
      {advanced && report.bias[0] ? <BiasCard report={report} era={era} /> : null}
      {advanced ? <PhysicsCard game={game} /> : null}
      {report.pools.map((pool, i) => (
        <Card key={pool.key} title={t(i ? 'stats.freqExtra' : 'stats.freq')}>
          <NumberChart values={pool.numbers.map((x) => ({ n: x.n, value: x.count, z: x.z }))} expected={pool.expected} extra={i > 0} />
          <Hint text={t('stats.freqHint', { expected: num(pool.expected, 1) })} />
        </Card>
      ))}
      <div className="grid-2">
        <HotColdCard main={report.pools[0]} recent={recent} onRecent={setRecent} />
        <GapsCard main={report.pools[0]} />
      </div>
      <PairsCard pairs={report.pairs} size={game.pools[0].size} />
      <NeighboursCard nb={report.neighbours} />
      {advanced && report.patterns ? <PatternsCard patterns={report.patterns} /> : null}
      <RepeatsCards report={report} era={era} />
    </>
  );
}
