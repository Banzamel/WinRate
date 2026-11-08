import { useI18n } from '../../../shared/i18n';
import { Table } from '../../../shared/ui';
import type { BacktestResult as Result } from '../../analysis';
import type { GameInfo } from '../../game';

// The filtered player next to a random one, against the exact expectation.
export function BacktestResult({ r, game }: { r: Result; game: GameInfo }) {
  const { t, num, pct, money, date } = useI18n();
  const total = r.draws * r.tickets;
  const cur = game.price.currency;
  const rows = game.tiers.map((tier) => [<strong>{tier.id}</strong>, num(r.strategy.tiers[tier.id]), num(r.random.tiers[tier.id]), num(total * tier.probability, 2)]);
  rows.push([<strong>{t('sim.anyPrize')}</strong>, num(r.strategy.any), num(r.random.any), num(total * game.anyPrize, 1)]);
  const diff = r.strategy.any - r.random.any;
  const sd = Math.sqrt(2 * total * game.anyPrize * (1 - game.anyPrize)) || 1;
  return (
    <div className="result">
      <p>{t('sim.backtestSummary', { draws: num(r.draws), from: date(r.from || ''), to: date(r.to || ''), tickets: num(r.tickets), total: num(total) })}</p>
      <Table header={[t('rules.tier'), t('strategy.filtered'), t('strategy.random'), t('sim.expected')]} rows={rows} />
      {r.strategy.prize || r.random.prize ? <p>{t('sim.fixedPrizes', { a: money(r.strategy.prize, cur), b: money(r.random.prize, cur), spent: money(total * game.price.amount, cur) })}</p> : null}
      <p>{t('sim.survived', { n: num(r.survived), total: num(r.draws), share: pct(r.draws ? r.survived / r.draws : 0) })}</p>
      <p className={Math.abs(diff) > 2 * sd ? 'warn' : 'muted'}>{t('sim.zDiff', { diff: num(diff), z: num(diff / sd, 2) })}</p>
    </div>
  );
}
