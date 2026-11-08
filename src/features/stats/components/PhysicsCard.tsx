import { useState } from 'react';
import { ballEffect } from '../../../core/physics';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint, NumberInput, Select, Stat } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import { BALL_SETS } from '../ballSets';

type Field = 'massG' | 'spreadG' | 'diameterMm';

// How much could manufacturing tolerances move the chance of a number, and how long to notice?
export function PhysicsCard({ game }: { game: GameInfo }) {
  const { t, num, pct } = useI18n();
  const pool = game.pools[0];
  const [opts, setOpts] = useState({ ...BALL_SETS[0], sensitivity: 0.5 });
  const r = ballEffect({ ...opts, size: pool.size, pick: pool.pick, drawsPerYear: game.drawsPerYear });
  const input = (key: Field, label: string, step: number) => (
    <label>{label}<NumberInput value={opts[key]} step={step} min={0} onChange={(v) => setOpts({ ...opts, [key]: v || 0 })} /></label>
  );
  const preset = (id: string) => { const set = BALL_SETS.find((s) => s.id === id); if (set) setOpts({ ...opts, ...set }); };
  return (
    <Card title={t('physics.title')}>
      <Hint text={t('physics.intro')} />
      <div className="form-row">
        <label>{t('physics.preset')}<Select value={opts.id} options={BALL_SETS.map((s): [string, string] => [s.id, t(`physics.set.${s.id}`)])} onChange={preset} /></label>
        {input('massG', t('physics.mass'), 0.1)}
        {input('spreadG', t('physics.spread'), 0.01)}
        {input('diameterMm', t('physics.diameter'), 1)}
        <label>{t('physics.sensitivity')}<Select value={opts.sensitivity} options={[[0.5, t('physics.beta.half')], [1, t('physics.beta.one')], [2, t('physics.beta.two')]]} onChange={(v) => setOpts({ ...opts, sensitivity: Number(v) })} /></label>
      </div>
      <div className="result">
        <div className="stats-row">
          <Stat label={t('physics.velocity')} value={`${num(r.vAvg, 2)} m/s`} sub={t('physics.velocityLight', { v: num(r.vLight, 2) })} />
          <Stat label={t('physics.edge')} value={`+${pct(r.edge, 2)}`} sub={t('physics.edgeSub')} />
          <Stat label={t('physics.ticket')} value={`×${num(r.ticketEdge, 3)}`} sub={t('physics.ticketSub', { k: pool.pick })} />
          <Stat label={t('physics.detect')} value={num(r.drawsToDetect)} sub={t('physics.years', { years: num(r.yearsToDetect) })} />
        </div>
        <p>{t('physics.summary', { edge: pct(r.edge, 2), draws: num(r.drawsToDetect), years: num(r.yearsToDetect) })}</p>
      </div>
      <Hint text={t('physics.hint')} />
    </Card>
  );
}
