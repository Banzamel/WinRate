import { useI18n } from '../../../shared/i18n';
import { nextDrawOf, type GameInfo } from '../gameInfo';
import { Countdown } from './Countdown';

export function GameHeader({ game }: { game: GameInfo }) {
  const { t, date } = useI18n();
  const next = nextDrawOf(game);
  const when = date(next, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: game.schedule.timeZone });
  return (
    <div className="game-head">
      <div><h1>{game.name}</h1><span className="muted">{t(`game.${game.id}.tagline`)}</span></div>
      <div className="next-draw">
        <span className="muted">{t('game.nextDraw', { when })}</span>
        <Countdown iso={next} />
      </div>
    </div>
  );
}
