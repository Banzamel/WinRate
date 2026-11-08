// Generator: tickets for the next draw; every ticket passes all active filters and is the least
// popular of several such tickets. Saved coupons are checked against the results automatically.
import { useState } from 'react';
import { api } from '../backend/api';
import { t, num, money, pct, date } from '../i18n';
import { state, gameSettings, saveGameSettings, advanced, runJob, toast, notify, errorText } from '../store';
import { Card, Hint, Balls, NumberInput, Select, Spinner, Table, BusyButton, Picker, comb } from '../ui';
import type { Coupon, Draw, GameInfo, Tier } from '../types';

// Tickets: of 12 random tickets that pass the active filters the least popular one is kept — the
// same chance to win, but a win is shared with fewer players. System numbers: within the filters.
const STRATEGY = 'unpopular';
const SYSTEM_STRATEGY = 'filtered';

const copy = (text: string) => { navigator.clipboard.writeText(text); toast(t('generator.copied'), 'good'); };
const popTone = (p: number) => (p > 3 ? 'bad' : p < 0.7 ? 'good' : '');

export function GeneratorView({ id }: { id: string }) {
  const game = state.games[id];
  // Tickets may share any numbers (only identical tickets are skipped).
  const { count = 5 } = gameSettings(id).generator || {};
  const out = state.tickets[id];
  const working = !!state.jobs.generate;
  const go = () => {
    runJob('generate', async () => { state.tickets[id] = await api.generate(id, { count, strategy: STRATEGY }); })
      .catch((e) => toast(errorText(e), 'bad'));
  };
  return (
    <>
      <Card title={t('generator.title')}>
        <div className="form-row">
          <label>{t('generator.count')}<NumberInput value={count} min={1} max={200} onChange={(v) => saveGameSettings(id, { generator: { count: Math.max(1, Math.min(200, v || 1)) } })} /></label>
          {working ? <Spinner text={t('generator.working')} /> : <button className="btn primary" onClick={go}>{t('generator.go')}</button>}
        </div>
        <Hint text={t('generator.filtersNote')} />
      </Card>
      {out ? (
        <Card title={t('generator.tickets', { n: num(out.tickets.length) })}>
          <div className="tickets">
            {out.tickets.map((tk: number[][], i: number) => (
              <div className="ticket" key={i}>
                <span className="muted">{`${i + 1}.`}</span>
                <Balls pools={tk} />
                {out.popularity ? <span className={`pop ${popTone(out.popularity[i])}`} title={t('generator.popularityTitle')}>{t('generator.popularity', { x: num(out.popularity[i], out.popularity[i] < 10 ? 2 : 0) })}</span> : null}
              </div>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => copy(out.tickets.map((tk: number[][]) => tk.map((p) => p.join(' ')).join(' | ')).join('\n'))}>{t('generator.copy')}</button>
            <SaveButton id={id} game={game} coupon={() => ({ tickets: out.tickets })} />
            <span className="muted">{t('generator.cost', { cost: money(out.tickets.length * game.price.amount, game.price.currency) })}</span>
          </div>
          <Hint text={t('generator.honest', { odds: num(game.combinations / out.tickets.length) })} />
        </Card>
      ) : null}
      <MineCard id={id} game={game} />
      {game.system ? <SystemCard id={id} game={game} /> : null}
      <CouponsCard id={id} game={game} />
      {advanced() ? <WheelCard id={id} game={game} /> : null}
    </>
  );
}

// Abbreviated wheel: the fewest tickets that guarantee t hits when t drawn numbers are among yours.
function WheelCard({ id, game }: { id: string; game: GameInfo }) {
  const pool = game.pools[0];
  const st = state.wheel[id] || (state.wheel[id] = { numbers: [], guarantee: Math.min(3, pool.pick), result: null });
  const change = (patch: Partial<typeof st>) => { Object.assign(st, { result: null }, patch); notify(); };
  const r = st.result;
  return (
    <Card title={t('wheel.title')}>
      <Hint text={t('wheel.intro', { k: pool.pick })} />
      <Picker size={pool.size} chosen={st.numbers} onToggle={(n) => change({ numbers: st.numbers.includes(n) ? st.numbers.filter((x) => x !== n) : [...st.numbers, n].sort((a, b) => a - b) })} />
      <div className="form-row">
        <span className="muted">{t('wheel.chosen', { n: st.numbers.length })}</span>
        <label>{t('wheel.guarantee')}
          <Select value={st.guarantee} options={Array.from({ length: pool.pick - 1 }, (_, i) => i + 2).map((g): [number, string] => [g, t('wheel.guaranteeN', { t: g })])} onChange={(v) => change({ guarantee: Number(v) })} />
        </label>
        <button className="btn ghost" onClick={() => change({ numbers: [] })}>{t('wheel.clear')}</button>
        <BusyButton className="btn primary" disabled={st.numbers.length < pool.pick} onClick={async () => {
          try { st.result = await api.wheel(id, { numbers: st.numbers, guarantee: st.guarantee }); } catch (e) { toast(errorText(e), 'bad'); }
          notify();
        }}>{t('wheel.go')}</BusyButton>
      </div>
      {r ? (
        <div className="result">
          <p>{t('wheel.summary', { n: num(r.tickets.length), full: num(r.full), m: r.numbers.length, t: r.t, cost: money(r.tickets.length * game.price.amount, game.price.currency) })}</p>
          <div className="tickets">{r.tickets.map((tk: number[], i: number) => <div className="ticket" key={i}><span className="muted">{`${i + 1}.`}</span><Balls pools={[tk]} /></div>)}</div>
          <button className="btn" onClick={() => copy(r.tickets.map((tk: number[]) => tk.join(' ')).join('\n'))}>{t('generator.copy')}</button>
        </div>
      ) : null}
      <Hint text={t(game.pools.length > 1 ? 'wheel.hintEuro' : 'wheel.hint')} />
    </Card>
  );
}

// Guaranteed fixed prizes of a row plus the count of pool prizes (amounts depend on the draw).
function fixedPayout(row: any, tiers: Tier[], game: GameInfo) {
  const fixed = tiers.reduce((s, tier) => s + (tier.fixed && row.wins[tier.id] ? tier.fixed * row.wins[tier.id] : 0), 0);
  const pools = tiers.filter((tier) => !tier.fixed && row.wins[tier.id]).length;
  return fixed ? `${money(fixed, game.price.currency)}${pools ? ' + …' : ''}` : (pools ? '…' : '–');
}

// Lotto system bet: m numbers = every 6-number combination of them, with the prizes it guarantees.
function SystemCard({ id, game }: { id: string; game: GameInfo }) {
  const pool = game.pools[0];
  const sys = game.system!;
  const st = state.system[id] || (state.system[id] = { m: sys.min, numbers: [], result: null });
  const change = (patch: Partial<typeof st>) => { Object.assign(st, { result: null }, patch); notify(); };
  const run = (auto: boolean) => async () => {
    try {
      st.result = await api.system(id, { m: st.m, numbers: auto ? null : st.numbers, strategy: SYSTEM_STRATEGY });
      st.numbers = st.result.numbers;
    } catch (e) { toast(errorText(e), 'bad'); }
    notify();
  };
  const r = st.result;
  const cost = r ? r.table.bets * game.price.amount : 0;
  const tiers = game.tiers;
  return (
    <Card title={t('system.title')}>
      <Hint text={t('system.intro', { min: sys.min, max: sys.max })} />
      <div className="form-row">
        <label>{t('system.size')}
          <Select value={st.m} options={Array.from({ length: sys.max - sys.min + 1 }, (_, i) => sys.min + i).map((m): [number, string] => [m, t('system.sizeN', { m, bets: comb(m, pool.pick), cost: money(comb(m, pool.pick) * game.price.amount, game.price.currency) })])}
            onChange={(v) => change({ m: Number(v), numbers: st.numbers.slice(0, Number(v)) })} />
        </label>
        <BusyButton className="btn primary" onClick={run(true)}>{t('system.auto')}</BusyButton>
        <BusyButton disabled={st.numbers.length !== st.m} onClick={run(false)}>{t('system.mine', { n: st.numbers.length, m: st.m })}</BusyButton>
        <button className="btn ghost" onClick={() => change({ numbers: [] })}>{t('wheel.clear')}</button>
      </div>
      <Picker size={pool.size} chosen={st.numbers} onToggle={(n) => {
        if (st.numbers.includes(n)) change({ numbers: st.numbers.filter((x) => x !== n) });
        else if (st.numbers.length < st.m) change({ numbers: [...st.numbers, n].sort((a, b) => a - b) });
      }} />
      {r ? (
        <div className="result">
          <div className="ticket"><Balls pools={[r.numbers]} /><SaveButton id={id} game={game} coupon={() => ({ tickets: r.bets.map((b: any) => [b.numbers]), system: r.numbers })} /></div>
          <p>{t('system.summary', { bets: num(r.table.bets), cost: money(cost, game.price.currency), pass: num(r.bets.filter((b: any) => b.passes).length), odds: num(1 / r.table.jackpot), any: pct(r.table.any, 2) })}</p>
          <Table
            header={[t('system.drawn'), t('system.chance'), ...tiers.map((tier) => t('system.tier', { tier: tier.id })), t('system.payout')]}
            rows={r.table.rows.slice().reverse().filter((row: any) => Object.keys(row.wins).length).map((row: any) => [
              t('system.drawnN', { j: row.drawnAmongYours, m: r.table.m }), `1 : ${num(row.oneIn, row.oneIn < 100 ? 1 : 0)}`,
              ...tiers.map((tier) => (row.wins[tier.id] ? num(row.wins[tier.id]) : '–')),
              fixedPayout(row, tiers, game),
            ])}
          />
          <details>
            <summary>{t('system.bets', { n: num(r.bets.length) })}</summary>
            <div className="tickets">
              {r.bets.map((b: any, i: number) => (
                <div key={i} className={`ticket ${b.passes ? '' : 'dim'}`}>
                  <span className="muted">{`${i + 1}.`}</span><Balls pools={[b.numbers]} />
                  {b.passes ? null : <span className="pop bad">{t('system.filtered')}</span>}
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : null}
      <Hint text={t('system.hint')} />
    </Card>
  );
}

// Saved coupons: the tickets of one draw (the next one when saved), kept in the game settings.
const couponsOf = (id: string) => gameSettings(id).coupons || [];

// Local date (YYYY-MM-DD) of the next draw of a game.
function nextDrawDate(game: GameInfo) {
  const next = game.nextDraws.find((d) => new Date(d).getTime() > Date.now()) || game.nextDraws[0];
  return new Intl.DateTimeFormat('sv-SE', { timeZone: game.schedule.timeZone }).format(new Date(next));
}

function SaveButton({ id, game, coupon }: { id: string; game: GameInfo; coupon: () => Pick<Coupon, 'tickets' | 'system'> }) {
  return (
    <button className="btn" onClick={async () => {
      const drawDate = nextDrawDate(game);
      await saveGameSettings(id, { coupons: [...couponsOf(id), { id: Date.now(), drawDate, price: game.price.amount, ...coupon() }] });
      toast(t('coupons.saved', { date: date(drawDate) }), 'good');
    }}>{t('coupons.save')}</button>
  );
}

// Hits of every ticket against the draw of the coupon's date and its prize tier.
function checkCoupon(coupon: Coupon, draws: Draw[], game: GameInfo) {
  const draw = draws.find((d) => d.date === coupon.drawDate);
  if (!draw) return null;
  const rows = coupon.tickets.map((tk) => {
    const hits = tk.map((nums, i) => nums.filter((x) => draw.pools[i].includes(x)).length);
    return { tk, hits, tier: game.tiers.find((tier) => tier.hits.every((h, i) => h === hits[i])) || null };
  });
  const fixed = rows.reduce((s, r) => s + (r.tier && r.tier.fixed ? r.tier.fixed : 0), 0);
  return { draw, rows, fixed, pool: rows.filter((r) => r.tier && !r.tier.fixed).length };
}

const hitSum = (r: { hits: number[] }) => r.hits.reduce((s, h) => s + h, 0);

function CouponsCard({ id, game }: { id: string; game: GameInfo }) {
  const coupons = couponsOf(id);
  if (!coupons.length) return null;
  const draws = state.history[id] || [];
  const last = draws.length ? draws[draws.length - 1].date : '';
  const cur = game.price.currency;
  const remove = (c: Coupon) => saveGameSettings(id, { coupons: couponsOf(id).filter((x) => x.id !== c.id) });
  let spent = 0; let won = 0;
  const items = coupons.slice().reverse().map((c) => {
    const res = checkCoupon(c, draws, game);
    const cost = c.tickets.length * (c.price || game.price.amount);
    if (res) { spent += cost; won += res.fixed; }
    const status = res
      ? <span className={res.fixed || res.pool ? 'good' : 'muted'}>{res.fixed || res.pool ? t('coupons.won', { fixed: money(res.fixed, cur), pool: res.pool }) : t('coupons.nothing')}</span>
      : <span className="warn">{c.drawDate > last ? t('coupons.waiting') : t('coupons.noDraw')}</span>;
    const head = (
      <div className="coupon-head">
        <strong>{date(c.drawDate)}</strong>
        <span className="muted">{c.system ? t('coupons.system', { m: c.system.length, n: num(c.tickets.length) }) : t('coupons.tickets', { n: num(c.tickets.length) })}</span>
        <span className="muted">{money(cost, cur)}</span>
        {status}
        <button className="icon-btn" title={t('coupons.remove')} onClick={() => remove(c)}>✕</button>
      </div>
    );
    const yours = c.system ? <div className="ticket"><span className="muted">{t('coupons.yourNumbers')}</span><Balls pools={[c.system]} /></div> : null;
    if (!res) {
      return (
        <div className="coupon" key={c.id}>
          {head}{yours}
          {c.system ? null : <div className="tickets">{c.tickets.map((tk, i) => <div className="ticket" key={i}><Balls pools={tk} /></div>)}</div>}
        </div>
      );
    }
    const shown = c.system ? res.rows.slice().sort((a, b) => hitSum(b) - hitSum(a)).slice(0, 10) : res.rows;
    return (
      <div className="coupon" key={c.id}>
        {head}
        <div className="ticket"><span className="muted">{t('coupons.result')}</span><Balls pools={res.draw.pools} /></div>
        {yours}
        <div className="tickets">
          {shown.map((r, i) => (
            <div key={i} className={`ticket${r.tier ? '' : ' dim'}`}>
              <Balls pools={r.tk} />
              <span className={`pop${r.tier ? ' good' : ''}`}>{t('coupons.hits', { hits: r.hits.join('+') }) + (r.tier ? ` → ${r.tier.fixed ? money(r.tier.fixed, cur) : t('coupons.poolPrize', { tier: r.tier.id })}` : '')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  });
  return (
    <Card title={t('coupons.title', { n: num(coupons.length) })}>
      {spent ? <p>{t('coupons.balance', { spent: money(spent, cur), won: money(won, cur) })}</p> : null}
      {items}
      <Hint text={t('coupons.hint')} />
    </Card>
  );
}

// "Your numbers": a ticket picked or typed by the player, checked against the active filters and
// rated by how often a win would be shared. Every ticket keeps the same chance to win.
function verdict(r: any): [string, string] {
  if (r.failed.length) return ['bad', 'mine.verdict.filters'];
  if (r.popularity > 2) return ['warn', 'mine.verdict.popular'];
  if (r.popularity < 0.7) return ['good', 'mine.verdict.good'];
  return ['', 'mine.verdict.ok'];
}

function MineCard({ id, game }: { id: string; game: GameInfo }) {
  const st = state.mine[id] || (state.mine[id] = { pools: game.pools.map(() => []), result: null });
  const [typed, setTyped] = useState('');
  const change = (pools: number[][]) => { st.pools = pools; st.result = null; notify(); };
  const full = st.pools.every((nums, i) => nums.length === game.pools[i].pick);
  const useTyped = () => {
    const nums = (typed.match(/\d+/g) || []).map(Number);
    let at = 0;
    change(game.pools.map((p) => { const part = [...new Set(nums.slice(at, at + p.pick))].sort((a, b) => a - b); at += p.pick; return part; }));
  };
  const toggle = (i: number, n: number) => {
    const nums = st.pools[i];
    const p = game.pools[i];
    if (nums.includes(n)) change(st.pools.map((x, j) => (j === i ? nums.filter((y) => y !== n) : x)));
    else if (nums.length < p.pick) change(st.pools.map((x, j) => (j === i ? [...nums, n].sort((a, b) => a - b) : x)));
  };
  const r = st.result;
  let result = null;
  if (r && r.error) result = <p className="bad">{t(`history.invalid.${r.error}`)}</p>;
  else if (r) {
    const [tone, key] = verdict(r);
    const pick = game.pools[0].pick;
    result = (
      <div className="result">
        <div className="ticket"><Balls pools={st.pools} /><SaveButton id={id} game={game} coupon={() => ({ tickets: [st.pools.map((nums) => nums.slice())] })} /></div>
        <p className={tone}><strong>{t(key)}</strong></p>
        {r.failed.length
          ? <div><p>{t('mine.failed')}</p><ul>{r.failed.map((fid: string) => <li key={fid}><strong>{t(`filter.${fid}`)}</strong>{' — '}{t(`filter.${fid}.hint`)}</li>)}</ul></div>
          : <p className="good">{t('mine.passes')}</p>}
        <p><span className={`pop ${popTone(r.popularity)}`}>{t('generator.popularity', { x: num(r.popularity, r.popularity < 10 ? 2 : 0) })}</span>{' '}{t('mine.popularity')}</p>
        <p>{r.best === pick ? t('mine.alreadyDrawn') : t('mine.closest', { n: r.best })}</p>
        <div className="tickets">{r.closest.map((d: Draw, i: number) => <div className="ticket" key={i}><span className="muted">{date(d.date)}</span><Balls pools={d.pools} hits={st.pools} /></div>)}</div>
      </div>
    );
  }
  return (
    <Card title={t('mine.title')}>
      <div className="form-row">
        <label>{t('mine.typeLabel')}
          <input type="text" style={{ width: '240px' }} placeholder={t(game.pools.length > 1 ? 'mine.typeEuro' : 'mine.type')} value={typed}
            onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') useTyped(); }} />
        </label>
        <button className="btn" onClick={useTyped}>{t('mine.use')}</button>
        <BusyButton className="btn primary" disabled={!full} onClick={async () => {
          try { st.result = await api.checkTicket(id, st.pools); } catch (e) { toast(errorText(e), 'bad'); }
          notify();
        }}>{t('mine.check')}</BusyButton>
        <button className="btn ghost" onClick={() => change(game.pools.map(() => []))}>{t('wheel.clear')}</button>
      </div>
      {game.pools.map((p, i) => <Picker key={i} size={p.size} chosen={st.pools[i]} extra={i > 0} onToggle={(n) => toggle(i, n)} />)}
      {result}
      <Hint text={t('mine.hint')} />
    </Card>
  );
}
