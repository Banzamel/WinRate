import { useI18n } from '../../../shared/i18n';
import { Balls } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import type { Coupon } from '../../settings';
import { hitSum, type CouponCheck } from '../coupons';

interface Props { game: GameInfo; coupon: Coupon; res: CouponCheck | null; lastDate: string; onRemove: () => void }

// One saved coupon: its draw, cost and outcome; once checked, the hits of every ticket.
export function CouponItem({ game, coupon: c, res, lastDate, onRemove }: Props) {
  const { t, num, money, date } = useI18n();
  const cur = game.price.currency;
  const won = res && (res.fixed || res.pool);
  const status = res
    ? <span className={won ? 'good' : 'muted'}>{won ? t('coupons.won', { fixed: money(res.fixed, cur), pool: res.pool }) : t('coupons.nothing')}</span>
    : <span className="warn">{c.drawDate > lastDate ? t('coupons.waiting') : t('coupons.noDraw')}</span>;
  const shown = res ? (c.system ? res.rows.slice().sort((a, b) => hitSum(b) - hitSum(a)).slice(0, 10) : res.rows) : [];
  return (
    <div className="coupon">
      <div className="coupon-head">
        <strong>{date(c.drawDate)}</strong>
        <span className="muted">{c.system ? t('coupons.system', { m: c.system.length, n: num(c.tickets.length) }) : t('coupons.tickets', { n: num(c.tickets.length) })}</span>
        <span className="muted">{money(c.tickets.length * (c.price || game.price.amount), cur)}</span>
        {status}
        <button className="icon-btn" title={t('coupons.remove')} onClick={onRemove}>✕</button>
      </div>
      {res ? <div className="ticket"><span className="muted">{t('coupons.result')}</span><Balls pools={res.draw.pools} /></div> : null}
      {c.system ? <div className="ticket"><span className="muted">{t('coupons.yourNumbers')}</span><Balls pools={[c.system]} /></div> : null}
      {!res && !c.system ? <div className="tickets">{c.tickets.map((tk, i) => <div className="ticket" key={i}><Balls pools={tk} /></div>)}</div> : null}
      {res ? (
        <div className="tickets">
          {shown.map((r, i) => (
            <div key={i} className={`ticket${r.tier ? '' : ' dim'}`}>
              <Balls pools={r.tk} />
              <span className={`pop${r.tier ? ' good' : ''}`}>{t('coupons.hits', { hits: r.hits.join('+') }) + (r.tier ? ` → ${r.tier.fixed ? money(r.tier.fixed, cur) : t('coupons.poolPrize', { tier: r.tier.id })}` : '')}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
