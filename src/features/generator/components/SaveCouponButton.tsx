import { useI18n } from '../../../shared/i18n';
import type { GameInfo } from '../../game';
import type { Coupon } from '../../settings';
import { useCoupons } from '../hooks/useCoupons';

// Saves tickets as a coupon for the next draw; it is checked once that result is in.
export function SaveCouponButton({ game, coupon }: { game: GameInfo; coupon: () => Pick<Coupon, 'tickets' | 'system'> }) {
  const { t } = useI18n();
  const { save } = useCoupons(game);
  return <button className="btn" onClick={() => save(coupon())}>{t('coupons.save')}</button>;
}
