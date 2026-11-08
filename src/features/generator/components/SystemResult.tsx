import type { SystemRow } from '../../../core/bets';
import type { Tier } from '../../../core/games';
import { useI18n, type Translator } from '../../../shared/i18n';
import { Balls, Table } from '../../../shared/ui';
import type { SystemResult as Result } from '../../analysis';
import type { GameInfo } from '../../game';
import { SaveCouponButton } from './SaveCouponButton';

// Guaranteed fixed prizes of a row plus the count of pool prizes (amounts depend on the draw).
function payout(row: SystemRow, tiers: Tier[], currency: string, { money }: Translator): string {
  const fixed = tiers.reduce((s, tier) => s + (tier.fixed && row.wins[tier.id] ? tier.fixed * row.wins[tier.id] : 0), 0);
  const pools = tiers.filter((tier) => !tier.fixed && row.wins[tier.id]).length;
  return fixed ? `${money(fixed, currency)}${pools ? ' + …' : ''}` : (pools ? '…' : '–');
}

export function SystemResult({ game, r }: { game: GameInfo; r: Result }) {
  const i18n = useI18n();
  const { t, num, pct, money } = i18n;
  const tiers = game.tiers;
  const cur = game.price.currency;
  const rows = r.table.rows.slice().reverse().filter((row) => Object.keys(row.wins).length).map((row) => [
    t('system.drawnN', { j: row.drawnAmongYours, m: r.table.m }), `1 : ${num(row.oneIn || 0, (row.oneIn || 0) < 100 ? 1 : 0)}`,
    ...tiers.map((tier) => (row.wins[tier.id] ? num(row.wins[tier.id]) : '–')), payout(row, tiers, cur, i18n),
  ]);
  return (
    <div className="result">
      <div className="ticket"><Balls pools={[r.numbers]} /><SaveCouponButton game={game} coupon={() => ({ tickets: r.bets.map((b) => [b.numbers]), system: r.numbers })} /></div>
      <p>{t('system.summary', { bets: num(r.table.bets), cost: money(r.table.bets * game.price.amount, cur), pass: num(r.bets.filter((b) => b.passes).length), odds: num(1 / r.table.jackpot), any: pct(r.table.any, 2) })}</p>
      <Table header={[t('system.drawn'), t('system.chance'), ...tiers.map((tier) => t('system.tier', { tier: tier.id })), t('system.payout')]} rows={rows} />
      <details>
        <summary>{t('system.bets', { n: num(r.bets.length) })}</summary>
        <div className="tickets">
          {r.bets.map((b, i) => (
            <div key={i} className={`ticket ${b.passes ? '' : 'dim'}`}>
              <span className="muted">{`${i + 1}.`}</span><Balls pools={[b.numbers]} />
              {b.passes ? null : <span className="pop bad">{t('system.filtered')}</span>}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
