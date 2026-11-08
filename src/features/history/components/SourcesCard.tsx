import { useI18n } from '../../../shared/i18n';
import { BusyButton, Card, Hint } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import { useHistoryActions } from '../hooks/useHistoryActions';

// Download, import and export of the whole history.
export function SourcesCard({ game }: { game: GameInfo }) {
  const { t } = useI18n();
  const actions = useHistoryActions(game.id);
  return (
    <Card title={t('history.sources')}>
      <div className="btn-row">
        <BusyButton className="btn primary" onClick={actions.download}>{t('history.download')}</BusyButton>
        <BusyButton onClick={actions.importFile}>{t('history.import')}</BusyButton>
        <BusyButton onClick={actions.exportFile}>{t('history.export')}</BusyButton>
      </div>
      <Hint text={t('history.sourcesHint', { urls: game.sources.join(', ') })} />
      <Hint text={t('history.formats')} />
    </Card>
  );
}
