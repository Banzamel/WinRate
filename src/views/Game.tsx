// A game (Lotto or Eurojackpot): header with the next draw, and the sub-tabs.
import { useEffect, useState } from 'react';
import { t, date } from '../i18n';
import { state, loadHistory, notify } from '../store';
import { Tabs, Spinner } from '../ui';
import { Overview } from './Overview';
import { HistoryView } from './History';
import { StatsView } from './Stats';
import { FiltersView } from './Filters';
import { GeneratorView } from './Generator';
import { SimulationView } from './Simulation';

const TABS: Record<string, (p: { id: string }) => React.ReactNode> = {
  overview: Overview, generator: GeneratorView, filters: FiltersView, stats: StatsView, history: HistoryView, simulation: SimulationView,
};

// Countdown to a draw: "2 d 04:13:09".
function countdown(iso: string) {
  const ms = Math.max(0, new Date(iso).getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0')).join(':');
  return d ? `${d} ${t('common.daysShort')} ${hms}` : hms;
}

function Countdown({ iso }: { iso: string }) {
  const [, tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(timer); }, []);
  return <strong>{countdown(iso)}</strong>;
}

export function GameView({ id }: { id: string }) {
  const game = state.games[id];
  const next = game.nextDraws.find((d) => new Date(d).getTime() > Date.now()) || game.nextDraws[0];
  const active = state.tab[id];
  const [loaded, setLoaded] = useState(!!state.history[id]);
  useEffect(() => { if (!loaded) loadHistory(id).then(() => setLoaded(true)); }, [id, loaded]);
  const Body = TABS[active];
  return (
    <>
      <div className="game-head">
        <div><h1>{game.name}</h1><span className="muted">{t(`game.${id}.tagline`)}</span></div>
        <div className="next-draw">
          <span className="muted">{t('game.nextDraw', { when: date(next, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: game.schedule.timeZone }) })}</span>
          <Countdown iso={next} />
        </div>
      </div>
      <Tabs items={Object.keys(TABS)} active={active} onSelect={(tab) => { state.tab[id] = tab; notify(); }} />
      <div className="game-body">
        {loaded && state.history[id] ? <Body key={active} id={id} /> : <Spinner />}
      </div>
    </>
  );
}
