import { useI18n } from '../../../shared/i18n';
import { Balls } from '../../../shared/ui';
import type { TicketCheck } from '../../analysis';
import type { GameInfo } from '../../game';
import { PopularityPill } from './PopularityPill';
import { SaveCouponButton } from './SaveCouponButton';

type Checked = Exclude<TicketCheck, { error: unknown }>;

function verdict(r: Checked): [string, string] {
  if (r.failed.length) return ['bad', 'mine.verdict.filters'];
  if (r.popularity > 2) return ['warn', 'mine.verdict.popular'];
  if (r.popularity < 0.7) return ['good', 'mine.verdict.good'];
  return ['', 'mine.verdict.ok'];
}

// The rating of the player's own ticket. Every ticket keeps the same chance to win.
export function MineResult({ game, pools, result }: { game: GameInfo; pools: number[][]; result: TicketCheck }) {
  const { t, date } = useI18n();
  if (result.error) return <p className="bad">{t(`history.invalid.${result.error}`)}</p>;
  const [tone, key] = verdict(result);
  return (
    <div className="result">
      <div className="ticket"><Balls pools={pools} /><SaveCouponButton game={game} coupon={() => ({ tickets: [pools.map((nums) => nums.slice())] })} /></div>
      <p className={tone}><strong>{t(key)}</strong></p>
      {result.failed.length
        ? <div><p>{t('mine.failed')}</p><ul>{result.failed.map((id) => <li key={id}><strong>{t(`filter.${id}`)}</strong>{' — '}{t(`filter.${id}.hint`)}</li>)}</ul></div>
        : <p className="good">{t('mine.passes')}</p>}
      <p><PopularityPill value={result.popularity} />{' '}{t('mine.popularity')}</p>
      <p>{result.best === game.pools[0].pick ? t('mine.alreadyDrawn') : t('mine.closest', { n: result.best })}</p>
      <div className="tickets">{result.closest.map((d, i) => <div className="ticket" key={i}><span className="muted">{date(d.date)}</span><Balls pools={d.pools} hits={pools} /></div>)}</div>
    </div>
  );
}
