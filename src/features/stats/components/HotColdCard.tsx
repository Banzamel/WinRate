import type { NumberStat, PoolReport } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Ball, Card, Hint, NumberInput } from '../../../shared/ui';

function NumberList({ title, items }: { title: string; items: NumberStat[] }) {
  const { num } = useI18n();
  return (
    <div className="num-list">
      <h3>{title}</h3>
      <div className="num-items">{items.map((x) => <span className="num-item" key={x.n}><Ball n={x.n} small /><span className="muted">{num(x.recent)}</span></span>)}</div>
    </div>
  );
}

// The most and least frequent numbers of the last N draws.
export function HotColdCard({ main, recent, onRecent }: { main: PoolReport; recent: number; onRecent: (v: number) => void }) {
  const { t, num } = useI18n();
  const hot = [...main.numbers].sort((a, b) => b.recent - a.recent).slice(0, 8);
  const cold = [...main.numbers].sort((a, b) => a.recent - b.recent).slice(0, 8);
  return (
    <Card title={t('stats.hotCold', { n: num(main.recent) })}>
      <div className="recent-input">{t('stats.window')}<NumberInput value={recent} min={5} max={1000} onChange={(v) => onRecent(v || 50)} /></div>
      <NumberList title={t('stats.hot')} items={hot} />
      <NumberList title={t('stats.cold')} items={cold} />
      <Hint text={t('stats.hotColdHint')} />
    </Card>
  );
}
