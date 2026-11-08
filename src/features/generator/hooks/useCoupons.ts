import { useAppState, useServices } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { nextDrawDate, type GameInfo } from '../../game';
import type { Coupon } from '../../settings';

const NONE: Coupon[] = [];

// Saved coupons of a game: the tickets of one draw (the next one when saved), in the game settings.
export function useCoupons(game: GameInfo) {
  const { t, date } = useI18n();
  const { settings, toaster } = useServices();
  const coupons = useAppState((s) => s.settings.games[game.id]?.coupons || NONE);
  const save = async (coupon: Pick<Coupon, 'tickets' | 'system'>) => {
    const drawDate = nextDrawDate(game);
    await settings.setGame(game.id, { coupons: [...coupons, { id: Date.now(), drawDate, price: game.price.amount, ...coupon }] });
    toaster.show(t('coupons.saved', { date: date(drawDate) }), 'good');
  };
  const remove = (c: Coupon) => settings.setGame(game.id, { coupons: coupons.filter((x) => x.id !== c.id) });
  return { coupons, save, remove };
}
