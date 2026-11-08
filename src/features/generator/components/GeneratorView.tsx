// Generator: tickets for the next draw, the player's own numbers, system bets, saved coupons and
// (advanced) abbreviated wheels.
import { useAdvanced, useAppState } from '../../../app/hooks';
import { CouponsCard } from './CouponsCard';
import { MineCard } from './MineCard';
import { SystemCard } from './SystemCard';
import { TicketsCard } from './TicketsCard';
import { WheelCard } from './WheelCard';

export function GeneratorView({ id }: { id: string }) {
  const game = useAppState((s) => s.games[id]);
  const advanced = useAdvanced();
  return (
    <>
      <TicketsCard game={game} />
      <MineCard game={game} />
      {game.system ? <SystemCard game={game} system={game.system} /> : null}
      <CouponsCard game={game} />
      {advanced ? <WheelCard game={game} /> : null}
    </>
  );
}
