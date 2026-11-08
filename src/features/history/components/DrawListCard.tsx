import { useState } from 'react';
import { useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Balls, Card } from '../../../shared/ui';
import { useHistoryActions } from '../hooks/useHistoryActions';

const PAGE = 100;

// All draws, newest first, shown in pages.
export function DrawListCard({ id }: { id: string }) {
  const { t, num, date } = useI18n();
  const draws = useAppState((s) => s.history[id]);
  const { remove } = useHistoryActions(id);
  const [shown, setShown] = useState(PAGE);
  return (
    <Card title={t('history.all', { n: num(draws.length) })}>
      {draws.length ? (
        <div className="draw-list long">
          {draws.slice(-shown).reverse().map((d, i) => (
            <div className="draw-row" key={`${d.date}-${i}`}>
              <span className="muted">{date(d.date)}</span>
              <Balls pools={d.pools} />
              <button className="icon-btn" title={t('history.remove')} onClick={() => remove(d)}>✕</button>
            </div>
          ))}
          {shown < draws.length ? <button className="btn ghost" onClick={() => setShown(shown + PAGE * 5)}>{t('history.more', { n: num(draws.length - shown) })}</button> : null}
        </div>
      ) : <p className="muted">{t('history.empty')}</p>}
    </Card>
  );
}
