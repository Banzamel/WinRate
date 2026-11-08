// Expected value of a ticket at a given jackpot: how much of the price comes back on average,
// and how much an unpopular ticket gains by not sharing the jackpot.
import type { EvResult } from '../../../core/popularity';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint, NumberInput, Table } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import { useExpectedValue } from '../hooks/useExpectedValue';

export function EvCard({ game }: { game: GameInfo }) {
  const { t, num, pct, money } = useI18n();
  const { inputs, setInputs, result: r } = useExpectedValue(game);
  const cur = game.price.currency;
  const row = (label: string, e: EvResult) => [label, money(e.total, cur), pct(e.returnRate, 1), pct(e.share, 1)];
  const setPrize = (id: string, v: number | null) => setInputs({ ...inputs, prizes: { ...inputs.prizes, [id]: v || 0 } });
  return (
    <Card title={t('ev.title')}>
      <div className="form-row">
        <label>{t('ev.jackpot', { cur })}<NumberInput value={inputs.jackpot} min={0} step={1000000} className="wide" onChange={(v) => setInputs({ ...inputs, jackpot: v || 0 })} /></label>
        <label>{t('ev.sold')}<NumberInput value={inputs.sold} min={0} step={1000000} className="wide" onChange={(v) => setInputs({ ...inputs, sold: v || 0 })} /></label>
      </div>
      <details>
        <summary>{t('ev.prizes')}</summary>
        <div className="form-row">
          {game.tiers.slice(1).filter((tier) => !tier.fixed).map((tier) => (
            <label key={tier.id}>{tier.id}<NumberInput value={inputs.prizes[tier.id]} min={0} onChange={(v) => setPrize(tier.id, v)} /></label>
          ))}
        </div>
      </details>
      <div className="result">
        {r ? (
          <>
            <Table header={[t('ev.ticket'), t('ev.value'), t('ev.return'), t('ev.share')]} rows={[row(t('ev.average'), r.average), row(t('ev.unpopular'), r.unpopular)]} />
            <p>{t('ev.summary', { price: money(game.price.amount, cur), back: money(r.average.total, cur), lose: money(-r.average.net, cur) })}</p>
            {r.average.breakEven
              ? <p>{t('ev.breakEven', { jackpot: money(r.average.breakEven, cur), sold: num(inputs.sold) })}</p>
              : <p className="good">{t('ev.positive')}</p>}
          </>
        ) : null}
      </div>
      <Hint text={t('ev.hint')} />
    </Card>
  );
}
