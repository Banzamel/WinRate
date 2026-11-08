// Tickets for the next draw: each passes all active filters and is the least popular of 12 such
// tickets — the same chance to win, but a win is shared with fewer players.
import { useAppState, useServices } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { errorText } from '../../../shared/lib/text';
import { Balls, Card, Hint, NumberInput, Spinner } from '../../../shared/ui';
import { useJob } from '../../analysis';
import type { GameInfo } from '../../game';
import { ticketsText } from '../coupons';
import { PopularityPill } from './PopularityPill';
import { SaveCouponButton } from './SaveCouponButton';

export function TicketsCard({ game }: { game: GameInfo }) {
  const { t, num, money } = useI18n();
  const { analysis, settings, store, toaster } = useServices();
  const count = useAppState((s) => s.settings.games[game.id]?.generator?.count ?? 5);
  const out = useAppState((s) => s.results.tickets[game.id]);
  const working = !!useJob('generate');
  const go = () => analysis.generate(game.id, count, 'unpopular').then((r) => store.setResult('tickets', game.id, r)).catch((e) => toaster.show(errorText(e), 'bad'));
  const copy = () => { navigator.clipboard.writeText(ticketsText(out.tickets)); toaster.show(t('generator.copied'), 'good'); };
  return (
    <>
      <Card title={t('generator.title')}>
        <div className="form-row">
          <label>{t('generator.count')}<NumberInput value={count} min={1} max={200} onChange={(v) => settings.setGame(game.id, { generator: { count: Math.max(1, Math.min(200, v || 1)) } })} /></label>
          {working ? <Spinner text={t('generator.working')} /> : <button className="btn primary" onClick={go}>{t('generator.go')}</button>}
        </div>
        <Hint text={t('generator.filtersNote')} />
      </Card>
      {out ? (
        <Card title={t('generator.tickets', { n: num(out.tickets.length) })}>
          <div className="tickets">
            {out.tickets.map((tk, i) => <div className="ticket" key={i}><span className="muted">{`${i + 1}.`}</span><Balls pools={tk} /><PopularityPill value={out.popularity[i]} /></div>)}
          </div>
          <div className="btn-row">
            <button className="btn" onClick={copy}>{t('generator.copy')}</button>
            <SaveCouponButton game={game} coupon={() => ({ tickets: out.tickets })} />
            <span className="muted">{t('generator.cost', { cost: money(out.tickets.length * game.price.amount, game.price.currency) })}</span>
          </div>
          <Hint text={t('generator.honest', { odds: num(game.combinations / out.tickets.length) })} />
        </Card>
      ) : null}
    </>
  );
}
