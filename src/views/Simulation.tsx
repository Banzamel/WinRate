// Simulation (science mode): replays the past as if the future were unknown.
//  - Backtest: for each of the last N draws only the earlier ones are known; a player using the
//    active filters (the Generator's tickets) plays K tickets and they are scored against the real
//    result, next to a plain random player.
//  - Until it hits: for a past draw (result known to the referee only) tickets are drawn until one
//    matches, counting the attempts — and what they would have cost.
import { api } from '../backend/api';
import { t, num, pct, money, date } from '../i18n';
import { state, gameSettings, saveGameSettings, advanced, runJob, toast, errorText } from '../store';
import { Card, Hint, Table, Balls, NumberInput, Select, LaneProgress } from '../ui';
import type { GameInfo } from '../types';

export function SimulationView({ id }: { id: string }) {
  const game = state.games[id];
  // Same tickets as the Generator: every one passes the active filters (no strategy to choose).
  const { strategy: _strategy, recent: _recent, halfLife: _halfLife, ...saved } = (gameSettings(id).simulation || {}) as Record<string, number>;
  const opts = { tickets: 10, tests: 200, targets: 1, maxAttempts: id === 'lotto' ? 1e8 : 1e9, system: 0, ...saved, strategy: 'filtered' };
  const set = (patch: Record<string, number>) => { const { strategy: _s, ...keep } = { ...opts, ...patch }; saveGameSettings(id, { simulation: keep }); };
  const running = !!state.jobs.sim;

  const start = (kind: 'backtest' | 'untilHit') => () => {
    const draws = state.history[id].length;
    const job = kind === 'backtest'
      ? () => api.backtest(id, { strategy: opts.strategy, tickets: opts.tickets, tests: Math.min(opts.tests, draws - 1) })
      : () => api.untilHit(id, { strategy: opts.strategy, targets: Array.from({ length: Math.min(opts.targets, draws) }, (_, i) => -1 - i), maxAttempts: opts.maxAttempts, system: opts.system || 0 });
    runJob('sim', async () => { state[kind][id] = { ...(await job()), opts: { ...opts } }; })
      .catch((e) => { if (String(e).includes('cancelled')) toast(t('sim.cancelled')); else toast(errorText(e), 'bad'); });
  };

  const progressLabel = (info?: Record<string, unknown>) => (info && info.attempts ? t('sim.attemptsSoFar', { n: num(info.attempts as number) }) : null);

  return (
    <>
      <Card title={t('sim.title')}>
        <Hint text={t('sim.intro')} />
        <div className="sim-progress">
          <LaneProgress lane="sim" label={progressLabel} />
          {running ? <button className="btn ghost" onClick={() => api.cancel('sim')}>{t('common.cancel')}</button> : null}
        </div>
      </Card>
      <div className="sim-cards">
        {advanced() ? (
          <Card title={t('sim.backtest')}>
            <div className="form-row">
              <label>{t('sim.tickets')}<NumberInput value={opts.tickets} min={1} max={10000} onChange={(v) => set({ tickets: v || 1 })} /></label>
              <label>{t('sim.tests')}<NumberInput value={opts.tests} min={1} max={20000} onChange={(v) => set({ tests: v || 1 })} /></label>
              <button className="btn primary" disabled={running} onClick={start('backtest')}>{t('sim.run')}</button>
            </div>
            <Hint text={t('sim.backtestHint')} />
            {state.backtest[id] ? <BacktestResult r={state.backtest[id]} game={game} /> : null}
          </Card>
        ) : null}
        <Card title={t('sim.untilHit')}>
          <div className="form-row">
            <label>{t('sim.targets')}<NumberInput value={opts.targets} min={1} max={50} onChange={(v) => set({ targets: v || 1 })} /></label>
            {game.system ? (
              <label>{t('sim.betType')}
                <Select value={opts.system || 0} options={[[0, t('sim.single')], ...Array.from({ length: game.system.max - game.system.min + 1 }, (_, i) => game.system!.min + i).map((m): [number, string] => [m, t('sim.systemN', { m })])]} onChange={(v) => set({ system: Number(v) })} />
              </label>
            ) : null}
            <label>{t('sim.maxAttempts')}<NumberInput value={opts.maxAttempts} min={1e5} step={1e6} onChange={(v) => set({ maxAttempts: v || 1e8 })} /></label>
            <button className="btn primary" disabled={running} onClick={start('untilHit')}>{t('sim.run')}</button>
          </div>
          <Hint text={t('sim.untilHitHint')} />
          {state.untilHit[id] ? <UntilHitResult r={state.untilHit[id]} game={game} /> : null}
        </Card>
      </div>
    </>
  );
}

function BacktestResult({ r, game }: { r: any; game: GameInfo }) {
  const total = r.draws * r.tickets;
  const rows = game.tiers.map((tier) => [<strong>{tier.id}</strong>, num(r.strategy.tiers[tier.id]), num(r.random.tiers[tier.id]), num(total * tier.probability, 2)]);
  rows.push([<strong>{t('sim.anyPrize')}</strong>, num(r.strategy.any), num(r.random.any), num(total * game.anyPrize, 1)]);
  const fixed = r.strategy.prize || r.random.prize;
  const diff = r.strategy.any - r.random.any;
  const sd = Math.sqrt(2 * total * game.anyPrize * (1 - game.anyPrize)) || 1;
  return (
    <div className="result">
      <p>{t('sim.backtestSummary', { draws: num(r.draws), from: date(r.from), to: date(r.to), tickets: num(r.tickets), total: num(total) })}</p>
      <Table header={[t('rules.tier'), t('strategy.filtered'), t('strategy.random'), t('sim.expected')]} rows={rows} />
      {fixed ? <p>{t('sim.fixedPrizes', { a: money(r.strategy.prize, game.price.currency), b: money(r.random.prize, game.price.currency), spent: money(total * game.price.amount, game.price.currency) })}</p> : null}
      <p>{t('sim.survived', { n: num(r.survived), total: num(r.draws), share: pct(r.draws ? r.survived / r.draws : 0) })}</p>
      <p className={Math.abs(diff) > 2 * sd ? 'warn' : 'muted'}>{t('sim.zDiff', { diff: num(diff), z: num(diff / sd, 2) })}</p>
    </div>
  );
}

function UntilHitResult({ r, game }: { r: any; game: GameInfo }) {
  const rows = r.results.map((x: any) => {
    const status = (
      <span>
        {x.hit ? <span className="good">{t('sim.hit')}</span> : <span className="warn">{x.stopped ? t('sim.stopped') : t('sim.notYet')}</span>}
        {x.excludedBy ? <div className="muted small">{t('sim.unfiltered', { filters: x.excludedBy.map((f: string) => t(`filter.${f}`)).join(', ') })}</div> : null}
        <div className="muted small">{t('sim.notPlayed', { n: num((x.rejected || 0) + (x.repeats || 0) + (x.skipped || 0)) })}</div>
      </span>
    );
    const bets = x.system ? x.bets : x.attempts; // a system attempt plays several bets
    return [date(x.date), <Balls pools={x.numbers} small />, status, num(x.attempts), num((x.system ? x.expectedAttempts : x.expectedUniform) || 0),
      num(bets), bets ? money(bets * game.price.amount, game.price.currency) : '–', x.attempts ? num(x.attempts / game.drawsPerYear, 0) : '–'];
  });
  const hits = r.results.filter((x: any) => x.hit);
  const avg = hits.length ? hits.reduce((s: number, x: any) => s + (x.system ? x.bets : x.attempts), 0) / hits.length : 0;
  return (
    <div className="result">
      <Table
        className="small"
        header={[t('sim.draw'), t('sim.numbers'), t('sim.status'), r.results[0] && r.results[0].system ? t('sim.systemsTried', { m: r.results[0].system }) : t('sim.attempts'), t('sim.expectedAttempts'), t('sim.bets'), t('sim.cost'), t('sim.years')]}
        rows={rows}
      />
      {hits.length ? <p>{t('sim.avgAttempts', { avg: num(avg), combos: num(game.combinations), n: num(hits.length) })}</p> : null}
      <Hint text={t('sim.untilHitExplain')} />
    </div>
  );
}
