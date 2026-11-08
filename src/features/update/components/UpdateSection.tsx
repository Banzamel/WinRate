import { useAppState, useServices } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { updateText } from '../updateText';
import { UpdateActions } from './UpdateActions';

// The update status and buttons in Settings.
export function UpdateSection() {
  const i18n = useI18n();
  const { updates } = useServices();
  const update = useAppState((s) => s.appUpdate);
  const version = useAppState((s) => s.version);
  const busy = update.state === 'dev' || update.state === 'checking' || update.state === 'downloading';
  return (
    <div>
      <p>{updateText(update, version, i18n)}</p>
      <div className="row-actions">
        <button className="btn" disabled={busy} onClick={() => updates.check()}>{i18n.t('appUpdate.check')}</button>
        <UpdateActions update={update} />
      </div>
    </div>
  );
}
