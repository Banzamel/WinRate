import { useI18n } from '../../../shared/i18n';
import { Stat } from '../../../shared/ui';
import type { GameInfo } from '../../game';

// Rules, price, combinations, chance of any prize and the draw days.
export function RulesRow({ game }: { game: GameInfo }) {
  const { t, num, money, weekday } = useI18n();
  const days = game.schedule.weekdays.map(weekday).join(', ');
  const rules = game.pools.map((p, i) => t(i === 0 ? 'rules.main' : 'rules.extra', { pick: p.pick, size: p.size })).join(' + ');
  return (
    <div className="stats-row">
      <Stat label={t('rules.game')} value={rules} />
      <Stat label={t('rules.price')} value={money(game.price.amount, game.price.currency)} />
      <Stat label={t('rules.combinations')} value={num(game.combinations)} sub={t('rules.jackpotOdds', { n: num(game.combinations) })} />
      <Stat label={t('rules.anyPrize')} value={`1 : ${num(1 / game.anyPrize, 1)}`} />
      <Stat label={t('rules.days')} value={days} sub={t('rules.time', { time: game.schedule.time, zone: game.schedule.timeZone })} />
    </div>
  );
}
