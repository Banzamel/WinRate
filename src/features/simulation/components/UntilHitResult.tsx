import { useI18n } from '../../../shared/i18n';
import { Balls, Hint, Table } from '../../../shared/ui';
import type { UntilHitResult as One, UntilHitRun } from '../../analysis';
import type { GameInfo } from '../../game';

function Status({ x }: { x: One }) {
  const { t, num } = useI18n();
  return (
    <span>
      {x.hit ? <span className="good">{t('sim.hit')}</span> : <span className="warn">{x.stopped ? t('sim.stopped') : t('sim.notYet')}</span>}
      {x.excludedBy ? <div className="muted small">{t('sim.unfiltered', { filters: x.excludedBy.map((f) => t(`filter.${f}`)).join(', ') })}</div> : null}
      <div className="muted small">{t('sim.notPlayed', { n: num((x.rejected || 0) + (x.repeats || 0) + (x.skipped || 0)) })}</div>
    </span>
  );
}

// Per past draw: attempts until the result was drawn, what they would have cost, and how many years.
export function UntilHitResult({ r, game }: { r: UntilHitRun; game: GameInfo }) {
  const { t, num, money, date } = useI18n();
  const betsOf = (x: One) => (x.system ? x.bets || 0 : x.attempts); // a system attempt plays several bets
  const rows = r.results.map((x) => [
    date(x.date), <Balls pools={x.numbers} small />, <Status x={x} />, num(x.attempts), num((x.system ? x.expectedAttempts : x.expectedUniform) || 0),
    num(betsOf(x)), betsOf(x) ? money(betsOf(x) * game.price.amount, game.price.currency) : '–', x.attempts ? num(x.attempts / game.drawsPerYear, 0) : '–',
  ]);
  const hits = r.results.filter((x) => x.hit);
  const avg = hits.length ? hits.reduce((s, x) => s + betsOf(x), 0) / hits.length : 0;
  const system = r.results[0]?.system;
  return (
    <div className="result">
      <Table className="small" rows={rows}
        header={[t('sim.draw'), t('sim.numbers'), t('sim.status'), system ? t('sim.systemsTried', { m: system }) : t('sim.attempts'), t('sim.expectedAttempts'), t('sim.bets'), t('sim.cost'), t('sim.years')]} />
      {hits.length ? <p>{t('sim.avgAttempts', { avg: num(avg), combos: num(game.combinations), n: num(hits.length) })}</p> : null}
      <Hint text={t('sim.untilHitExplain')} />
    </div>
  );
}
