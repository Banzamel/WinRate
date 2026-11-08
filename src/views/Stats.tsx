// Statistics: is the draw fair? Frequencies, hot/cold, gaps, pairs, patterns, repeats —
// each against the exact expectation of a fair draw, with a chi-square test.
import { useEffect, useRef, useState } from 'react';
import { api } from '../backend/api';
import { t, num, pct, date } from '../i18n';
import { state, advanced, runJob, notify, errorText } from '../store';
import { Card, Hint, Table, Ball, Balls, CompareBars, NumberChart, FitBadge, PBadge, Spinner, NumberInput, Select, type CompareRow } from '../ui';
import { ballEffect } from './physics';
import type { Draw, GameInfo } from '../types';

export function StatsView({ id }: { id: string }) {
  const report = state.report[id];
  const draws = state.history[id];
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!draws.length || state.report[id] || state.jobs.stats) return;
    runJob('stats', async () => { state.report[id] = await api.report(id, { recent: state.recent }); })
      .catch((e) => setError(errorText(e)));
  });
  if (!draws.length) return <Card><p className="muted">{t('history.emptyGo')}</p></Card>;
  if (error) return <Card><p className="bad">{error}</p></Card>;
  if (!report) return <Card><Spinner text={t('stats.computing')} /><Hint text={t('stats.firstTime')} /></Card>;

  const game = state.games[id];
  const main = report.pools[0];
  const eraFrom = game.eras[game.eras.length - 1].from;
  const era = draws.filter((d) => d.date >= eraFrom);
  return (
    <>
      <Card title={t('stats.verdict')}>
        <p className="muted">{t('stats.verdictShort', { draws: num(report.draws), from: date(report.from), to: date(report.to) })}</p>
        <div className="verdicts">
          <VerdictRow label={t('stats.v.numbers')} fit={main.fit} />
          {report.pools[1] ? <VerdictRow label={t('stats.v.extra')} fit={report.pools[1].fit} /> : null}
          <VerdictRow label={t('stats.v.pairs')} fit={report.pairs.fit} />
          <VerdictRow label={t('stats.v.repeats')} fit={report.repeats.fit} />
          {advanced() && report.patterns ? Object.entries(report.patterns).map(([metric, p]: [string, any]) => <VerdictRow key={metric} label={t(`metric.${metric}`)} fit={p.fit} />) : null}
        </div>
        <Hint text={t('stats.verdictHint')} />
      </Card>
      {advanced() && report.bias && report.bias[0] ? <BiasCard report={report} era={era} /> : null}
      {advanced() ? <PhysicsCard game={game} /> : null}
      {report.pools.map((pool: any, i: number) => (
        <Card key={i} title={t(i ? 'stats.freqExtra' : 'stats.freq')}>
          <NumberChart values={pool.numbers.map((x: any) => ({ n: x.n, value: x.count, z: x.z }))} expected={pool.expected} extra={i > 0} />
          <Hint text={t('stats.freqHint', { expected: num(pool.expected, 1) })} />
        </Card>
      ))}
      <div className="grid-2">
        <Card title={t('stats.hotCold', { n: num(main.recent) })}>
          <div className="recent-input">{t('stats.window')}<NumberInput value={state.recent} min={5} max={1000} onChange={(v) => { state.recent = v || 50; delete state.report[id]; notify(); }} /></div>
          <NumberList title={t('stats.hot')} items={[...main.numbers].sort((a: any, b: any) => b.recent - a.recent).slice(0, 8)} value={(x) => num(x.recent)} />
          <NumberList title={t('stats.cold')} items={[...main.numbers].sort((a: any, b: any) => a.recent - b.recent).slice(0, 8)} value={(x) => num(x.recent)} />
          <Hint text={t('stats.hotColdHint')} />
        </Card>
        <Card title={t('stats.gaps')}>
          <Table
            header={[t('stats.number'), t('stats.gap'), t('stats.avgGap'), t('stats.maxGap'), t('stats.gapChance')]}
            rows={[...main.numbers].sort((a: any, b: any) => b.gap - a.gap).slice(0, 10).map((x: any) => [<Ball n={x.n} small />, num(x.gap), x.avgGap ? num(x.avgGap, 1) : '–', num(x.maxGap), pct(x.gapChance, 2)])}
          />
          <Hint text={t('stats.gapsHint')} />
        </Card>
      </div>
      <PairsCard report={report} game={game} />
      {report.neighbours ? <NeighboursCard nb={report.neighbours} /> : null}
      {advanced() && report.patterns ? <PatternsCard patterns={report.patterns} /> : null}
      <div className="grid-2">
        <Card title={t('stats.repeats')}>
          <CompareBars rows={report.repeats.observed.map((o: number, h: number) => ({ label: t('stats.repeatN', { n: h }), observed: o, expected: report.repeats.expected[h] }))} />
          <FitBadge fit={report.repeats.fit} />
          <Hint text={t('stats.repeatsHint')} />
        </Card>
        <Card title={t('stats.sameDraws')}>
          {report.repeatedDraws.length
            ? <div className="draw-list">{report.repeatedDraws.map((r: any, i: number) => <div className="draw-row" key={i}><Balls pools={[r.numbers]} /><span className="muted">{r.at.map((j: number) => date(era[j].date)).join(', ')}</span></div>)}</div>
            : <p>{t('stats.noSameDraws')}</p>}
          <Hint text={t('stats.sameDrawsHint', { combos: num(report.combinations), draws: num(report.draws), chance: pct(1 - Math.exp(-(report.draws * (report.draws - 1)) / 2 / report.combinations), 2) })} />
        </Card>
      </div>
    </>
  );
}

const VerdictRow = ({ label, fit }: { label: string; fit: any }) => <div className="verdict"><span>{label}</span><FitBadge fit={fit} /></div>;

function NumberList({ title, items, value }: { title: string; items: any[]; value: (x: any) => string }) {
  return (
    <div className="num-list">
      <h3>{title}</h3>
      <div className="num-items">{items.map((x) => <span className="num-item" key={x.n}><Ball n={x.n} small /><span className="muted">{value(x)}</span></span>)}</div>
    </div>
  );
}

// Physics: are some balls more likely, did anything change over time, does the machine remember?
function BiasCard({ report, era }: { report: any; era: Draw[] }) {
  return (
    <Card title={t('bias.title')}>
      <Hint text={t('bias.intro')} />
      {report.bias.map((b: any, i: number) => {
        if (!b) return null;
        const post = b.posterior;
        const top = [...post.numbers].sort((x: any, y: any) => y.observed - x.observed).slice(0, 6);
        const minMem = b.memory.reduce((m: any, l: any) => (l.p < m.p ? l : m), b.memory[0]);
        return (
          <div className="bias-pool" key={i}>
            {report.bias.length > 1 ? <h3>{t(i ? 'bias.extraPool' : 'bias.mainPool')}</h3> : null}
            <div className="verdicts">
              <div className="verdict"><span>{t('bias.balls')}</span><span className={`fit ${post.shrink > 0.2 ? 'warn' : 'good'}`}>{t('bias.signal', { pct: pct(post.shrink, 0) })}</span></div>
              <div className="verdict"><span>{t('bias.drift')}</span><PBadge p={b.drift.overall} /></div>
              {minMem ? <div className="verdict"><span>{t('bias.memory', { lag: minMem.lag })}</span><PBadge p={Math.min(1, minMem.p * b.memory.length)} /></div> : null}
              {b.runs ? <div className="verdict"><span>{t('bias.runs')}</span><PBadge p={b.runs.p} /></div> : null}
            </div>
            <div className="grid-2">
              <div>
                <h3>{t('bias.estimate')}</h3>
                <Table header={[t('stats.number'), t('bias.observed'), t('bias.estimated'), t('bias.edge')]}
                  rows={top.map((x: any) => [<Ball n={x.n} small extra={i > 0} />, pct(x.observed, 2), pct(x.p, 2), `${x.edge >= 0 ? '+' : ''}${pct(x.edge, 2)}`])} />
                <p className={b.best.edge > 1.05 ? 'warn' : ''}>{t('bias.bestTicket', { edge: num(b.best.edge, 3) })}</p>
              </div>
              <div>
                <h3>{t('bias.changes')}</h3>
                <Table header={[t('stats.number'), t('bias.since'), t('bias.before'), t('bias.after'), 'p']}
                  rows={b.drift.numbers.slice(0, 6).map((x: any) => [<Ball n={x.n} small extra={i > 0} />, era[x.at] ? date(era[x.at].date) : '–', pct(x.before, 1), x.after === null ? '–' : pct(x.after, 1), num(x.p, 3)])} />
              </div>
            </div>
          </div>
        );
      })}
      <Hint text={t('bias.hint')} />
    </Card>
  );
}

// Heat map of every pair's deviation from the expectation (z-score).
function Heat({ pairs, size }: { pairs: any; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const w = size + 1;
    const sd = Math.sqrt(pairs.expected) || 1;
    ctx.clearRect(0, 0, size * 10, size * 10);
    for (let x = 1; x <= size; x++) {
      for (let y = 1; y <= size; y++) {
        if (x === y) continue;
        const c = pairs.matrix[Math.min(x, y) * w + Math.max(x, y)];
        const z = Math.max(-3, Math.min(3, (c - pairs.expected) / sd));
        ctx.fillStyle = z >= 0 ? `rgba(240, 180, 60, ${z / 3})` : `rgba(80, 150, 255, ${-z / 3})`;
        ctx.fillRect((x - 1) * 10, (y - 1) * 10, 10, 10);
      }
    }
  }, [pairs, size]);
  return <canvas ref={ref} width={size * 10} height={size * 10} className="heat" title={t('stats.heatTitle')} />;
}

function PairsCard({ report, game }: { report: any; game: GameInfo }) {
  const p = report.pairs;
  const pairRow = (q: any) => [<span className="balls"><Ball n={q.a} small /><Ball n={q.b} small /></span>, num(q.count), num(q.z, 2)];
  return (
    <Card title={t('stats.pairs')}>
      <div className="pairs">
        <div><h3>{t('stats.likes')}</h3><Table header={[t('stats.pair'), t('stats.together'), 'z']} rows={p.strongest.slice(0, 10).map(pairRow)} /></div>
        <div><h3>{t('stats.dislikes')}</h3><Table header={[t('stats.pair'), t('stats.together'), 'z']} rows={p.weakest.slice(0, 10).map(pairRow)} /></div>
        <div><h3>{t('stats.heat')}</h3><Heat pairs={p} size={game.pools[0].size} /><Hint text={t('stats.heatHint')} /></div>
      </div>
      <p>{t('stats.pairsSummary', { expected: num(p.expected, 1), never: num(p.never), nObs: num(p.neighbours.count), nExp: num(p.neighbours.expected, 1) })}</p>
      <FitBadge fit={p.fit} />
      <Hint text={t('stats.pairsHint')} />
    </Card>
  );
}

// Groups a wide distribution (sum, spread) into buckets of `width`.
function bucketize(p: any, width: number): CompareRow[] {
  const rows: (CompareRow & { key: number })[] = [];
  p.values.forEach((v: number, i: number) => {
    const key = Math.floor(v / width) * width;
    let row = rows[rows.length - 1];
    if (!row || row.key !== key) { row = { key, label: `${key}–${key + width - 1}`, observed: 0, expected: 0 }; rows.push(row); }
    row.observed += p.observed[i]; row.expected += p.expected[i];
  });
  return rows.filter((r) => r.expected >= 0.05 || r.observed);
}

const WIDE = ['sum', 'spread', 'maxGap'];
function PatternsCard({ patterns }: { patterns: Record<string, any> }) {
  return (
    <Card title={t('stats.patterns')}>
      <div className="patterns">
        {Object.entries(patterns).filter(([m]) => !WIDE.includes(m)).map(([metric, p]) => (
          <div className="pattern" key={metric}>
            <h3>{t(`metric.${metric}`)}{' '}<FitBadge fit={p.fit} /></h3>
            <CompareBars rows={p.values.map((v: number, i: number) => ({ label: String(v), observed: p.observed[i], expected: p.expected[i] })).filter((r: CompareRow) => r.expected >= 0.05 || r.observed)} />
          </div>
        ))}
      </div>
      <div className="patterns">
        {WIDE.filter((metric) => patterns[metric]).map((metric) => (
          <div className="pattern" key={metric}>
            <h3>{t(`metric.${metric}`)}{' '}<FitBadge fit={patterns[metric].fit} /></h3>
            <CompareBars rows={bucketize(patterns[metric], metric === 'sum' ? 15 : metric === 'spread' ? 5 : 3)} />
          </div>
        ))}
      </div>
      <Hint text={t('stats.patternsHint')} />
    </Card>
  );
}

// What ball tolerances could do at most, from published regulations (mass spread of a set).
const BALL_SETS = [
  { id: 'nz', massG: 12, spreadG: 0.45, diameterMm: 50 }, // Lotto NZ: 11–13 g, set spread ≤ 0.45 g
  { id: 'texas', massG: 2.7, spreadG: 0.19, diameterMm: 40 }, // Texas: ping-pong style, ±0.095 g of the set average
];

function PhysicsCard({ game }: { game: GameInfo }) {
  const pool = game.pools[0];
  const [opts, setOpts] = useState({ ...BALL_SETS[0], sensitivity: 0.5 });
  const r = ballEffect({ ...opts, size: pool.size, pick: pool.pick, drawsPerYear: game.drawsPerYear });
  const input = (key: 'massG' | 'spreadG' | 'diameterMm', label: string, step: number) => (
    <label>{label}<NumberInput value={opts[key]} step={step} min={0} onChange={(v) => setOpts({ ...opts, [key]: v || 0 })} /></label>
  );
  return (
    <Card title={t('physics.title')}>
      <Hint text={t('physics.intro')} />
      <div className="form-row">
        <label>{t('physics.preset')}<Select value={opts.id} options={BALL_SETS.map((s): [string, string] => [s.id, t(`physics.set.${s.id}`)])} onChange={(v) => setOpts({ ...opts, ...BALL_SETS.find((s) => s.id === v)! })} /></label>
        {input('massG', t('physics.mass'), 0.1)}
        {input('spreadG', t('physics.spread'), 0.01)}
        {input('diameterMm', t('physics.diameter'), 1)}
        <label>{t('physics.sensitivity')}<Select value={opts.sensitivity} options={[[0.5, t('physics.beta.half')], [1, t('physics.beta.one')], [2, t('physics.beta.two')]]} onChange={(v) => setOpts({ ...opts, sensitivity: Number(v) })} /></label>
      </div>
      <div className="result">
        <div className="stats-row">
          <div className="stat"><span className="stat-label">{t('physics.velocity')}</span><strong>{`${num(r.vAvg, 2)} m/s`}</strong><span className="stat-sub">{t('physics.velocityLight', { v: num(r.vLight, 2) })}</span></div>
          <div className="stat"><span className="stat-label">{t('physics.edge')}</span><strong>{`+${pct(r.edge, 2)}`}</strong><span className="stat-sub">{t('physics.edgeSub')}</span></div>
          <div className="stat"><span className="stat-label">{t('physics.ticket')}</span><strong>{`×${num(r.ticketEdge, 3)}`}</strong><span className="stat-sub">{t('physics.ticketSub', { k: pool.pick })}</span></div>
          <div className="stat"><span className="stat-label">{t('physics.detect')}</span><strong>{num(r.drawsToDetect)}</strong><span className="stat-sub">{t('physics.years', { years: num(r.yearsToDetect) })}</span></div>
        </div>
        <p>{t('physics.summary', { edge: pct(r.edge, 2), draws: num(r.drawsToDetect), years: num(r.yearsToDetect) })}</p>
      </div>
      <Hint text={t('physics.hint')} />
    </Card>
  );
}

// Which number comes next to which in the sorted results, against the exact expectation.
function NeighboursCard({ nb }: { nb: any }) {
  const row = (p: any) => [<span className="balls"><Ball n={p.a} small />→<Ball n={p.b} small /></span>, num(p.count), num(p.expected, 1), num(p.z, 2)];
  const head = [t('stats.pair'), t('stats.together'), t('stats.expected'), 'z'];
  return (
    <Card title={t('nb.title')}>
      <Hint text={t('nb.intro')} />
      <div className="grid-2">
        <div><h3>{t('nb.often')}</h3><Table header={head} rows={nb.strongest.slice(0, 10).map(row)} /></div>
        <div><h3>{t('nb.rarely')}</h3><Table header={head} rows={nb.weakest.slice(0, 10).map(row)} /></div>
      </div>
      <h3>{t('nb.gaps')}</h3>
      <CompareBars rows={nb.gaps.slice(0, 20).map((o: number, i: number) => ({ label: `+${i + 1}`, observed: o, expected: nb.gapsExpected[i] }))} />
      <FitBadge fit={nb.fit} />
      <Hint text={t('nb.hint')} />
    </Card>
  );
}
