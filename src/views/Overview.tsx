// Overview: rules, schedule, exact odds of every prize tier and the latest draws.
import { useEffect, useRef, useState } from 'react';
import { api } from '../backend/api';
import { t, num, pct, money, date, language } from '../i18n';
import { state, advanced } from '../store';
import { Card, Stat, Table, Balls, Hint, NumberInput } from '../ui';
import type { GameInfo } from '../types';

export function Overview({ id }: { id: string }) {
  const game = state.games[id];
  const draws = state.history[id];
  const weekdays = game.schedule.weekdays.map((d) => new Intl.DateTimeFormat(language(), { weekday: 'long' }).format(new Date(Date.UTC(2024, 0, 7 + d)))).join(', ');
  const rules = game.pools.map((p, i) => t(i === 0 ? 'rules.main' : 'rules.extra', { pick: p.pick, size: p.size })).join(' + ');
  return (
    <>
      <div className="stats-row">
        <Stat label={t('rules.game')} value={rules} />
        <Stat label={t('rules.price')} value={money(game.price.amount, game.price.currency)} />
        <Stat label={t('rules.combinations')} value={num(game.combinations)} sub={t('rules.jackpotOdds', { n: num(game.combinations) })} />
        <Stat label={t('rules.anyPrize')} value={`1 : ${num(1 / game.anyPrize, 1)}`} />
        <Stat label={t('rules.days')} value={weekdays} sub={t('rules.time', { time: game.schedule.time, zone: game.schedule.timeZone })} />
      </div>
      <div className="grid-2">
        <Card title={t('rules.tiers')}>
          <Table
            header={[t('rules.tier'), t('rules.odds'), t('rules.probability'), t('rules.prize')]}
            rows={game.tiers.map((tier) => [
              <strong>{tier.id}</strong>, `1 : ${num(tier.oneIn, tier.oneIn < 100 ? 1 : 0)}`, pct(tier.probability, tier.probability < 0.001 ? 6 : 3),
              tier.fixed ? money(tier.fixed, game.price.currency) : t('rules.parimutuel'),
            ])}
          />
          <Hint text={t(`rules.${id}.notes`)} />
        </Card>
        <Card title={t('overview.latest')}>
          {draws.length
            ? <div className="draw-list">{draws.slice(-8).reverse().map((d, i) => <div className="draw-row" key={i}><span className="muted">{date(d.date)}</span><Balls pools={d.pools} /></div>)}</div>
            : <p className="muted">{t('history.empty')}</p>}
          <div className="stats-row compact">
            <Stat label={t('overview.stored')} value={num(draws.length)} />
            {draws.length ? <Stat label={t('overview.range')} value={`${date(draws[0].date)} – ${date(draws[draws.length - 1].date)}`} /> : null}
          </div>
          {advanced() ? <>
            <h3>{t('overview.eras')}</h3>
            <ul className="plain">{game.eras.map((e) => <li key={e.from}>{`${date(e.from)}: ${e.pools.map((p) => `${p.pick}/${p.size}`).join(' + ')}`}</li>)}</ul>
          </> : null}
        </Card>
      </div>
      {advanced() ? <EvCard id={id} game={game} /> : null}
      <Card title={t('overview.truth')}><Hint text={t('overview.truthText', { n: num(game.combinations), years: num(game.combinations / game.drawsPerYear, 0) })} /></Card>
    </>
  );
}

// Expected value of a ticket at a given jackpot: how much of the price comes back on average,
// and how much an unpopular ticket gains by not sharing the jackpot.
function EvCard({ id, game }: { id: string; game: GameInfo }) {
  const opts = useRef({ jackpot: game.typicalJackpot, sold: game.typicalSales, prizes: { ...game.typicalPrizes } as Record<string, number> });
  const [r, setR] = useState<any>(null);
  const cur = game.price.currency;
  const update = async () => setR(await api.expectedValue(id, opts.current));
  useEffect(() => { update(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const row = (label: string, e: any) => [label, money(e.total, cur), pct(e.returnRate, 1), pct(e.share, 1)];
  return (
    <Card title={t('ev.title')}>
      <div className="form-row">
        <label>{t('ev.jackpot', { cur })}<NumberInput value={opts.current.jackpot} min={0} step={1000000} className="wide" onChange={(v) => { opts.current.jackpot = v || 0; update(); }} /></label>
        <label>{t('ev.sold')}<NumberInput value={opts.current.sold} min={0} step={1000000} className="wide" onChange={(v) => { opts.current.sold = v || 0; update(); }} /></label>
      </div>
      <details>
        <summary>{t('ev.prizes')}</summary>
        <div className="form-row">
          {game.tiers.slice(1).filter((tier) => !tier.fixed).map((tier) => (
            <label key={tier.id}>{tier.id}<NumberInput value={opts.current.prizes[tier.id]} min={0} onChange={(v) => { opts.current.prizes[tier.id] = v || 0; update(); }} /></label>
          ))}
        </div>
      </details>
      {r ? (
        <div className="result">
          <Table header={[t('ev.ticket'), t('ev.value'), t('ev.return'), t('ev.share')]} rows={[row(t('ev.average'), r.average), row(t('ev.unpopular'), r.unpopular)]} />
          <p>{t('ev.summary', { price: money(game.price.amount, cur), back: money(r.average.total, cur), lose: money(-r.average.net, cur) })}</p>
          {r.average.breakEven
            ? <p>{t('ev.breakEven', { jackpot: money(r.average.breakEven, cur), sold: num(opts.current.sold) })}</p>
            : <p className="good">{t('ev.positive')}</p>}
        </div>
      ) : <div className="result" />}
      <Hint text={t('ev.hint')} />
    </Card>
  );
}
