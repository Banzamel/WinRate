// A game (Lotto or Eurojackpot): header with the next draw, and the sub-tabs.
import type { ComponentType } from 'react';
import { useAppState, useServices } from '../../../app/hooks';
import { Spinner, Tabs } from '../../../shared/ui';
import { FiltersView } from '../../filters';
import { GeneratorView } from '../../generator';
import { HistoryView } from '../../history';
import { OverviewView } from '../../overview';
import { SimulationView } from '../../simulation';
import { StatsView } from '../../stats';
import { GameHeader } from './GameHeader';

const TABS: Record<string, ComponentType<{ id: string }>> = {
  overview: OverviewView, generator: GeneratorView, filters: FiltersView, stats: StatsView, history: HistoryView, simulation: SimulationView,
};

export function GameView({ id }: { id: string }) {
  const { store } = useServices();
  const game = useAppState((s) => s.games[id]);
  const active = useAppState((s) => s.tabs[id] || 'overview');
  const loaded = useAppState((s) => !!s.history[id]);
  const Body = TABS[active];
  return (
    <>
      <GameHeader game={game} />
      <Tabs items={Object.keys(TABS)} active={active} onSelect={(tab) => store.setTab(id, tab)} />
      <div className="game-body">{loaded ? <Body key={active} id={id} /> : <Spinner />}</div>
    </>
  );
}
