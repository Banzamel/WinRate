// Saved coupons, newest first, checked against the results automatically, with the balance.
import { useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import { checkCoupon } from '../coupons';
import { useCoupons } from '../hooks/useCoupons';
import { CouponItem } from './CouponItem';

export function CouponsCard({ game }: { game: GameInfo }) {
  const { t, num, money } = useI18n();
  const draws = useAppState((s) => s.history[game.id]);
  const { coupons, remove } = useCoupons(game);
  if (!coupons.length) return null;
  const lastDate = draws.length ? draws[draws.length - 1].date : '';
  const checked = coupons.slice().reverse().map((c) => ({ c, res: checkCoupon(c, draws, game.tiers) }));
  const spent = checked.reduce((s, { c, res }) => s + (res ? c.tickets.length * (c.price || game.price.amount) : 0), 0);
  const won = checked.reduce((s, { res }) => s + (res ? res.fixed : 0), 0);
  const cur = game.price.currency;
  return (
    <Card title={t('coupons.title', { n: num(coupons.length) })}>
      {spent ? <p>{t('coupons.balance', { spent: money(spent, cur), won: money(won, cur) })}</p> : null}
      {checked.map(({ c, res }) => <CouponItem key={c.id} game={game} coupon={c} res={res} lastDate={lastDate} onRemove={() => remove(c)} />)}
      <Hint text={t('coupons.hint')} />
    </Card>
  );
}
