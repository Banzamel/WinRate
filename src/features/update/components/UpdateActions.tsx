import { useServices } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import type { AppUpdate } from '../types';

// "Download" when an update is available, "Restart and install" once it is downloaded.
export function UpdateActions({ update }: { update: AppUpdate }) {
  const { t } = useI18n();
  const { updates } = useServices();
  if (update.state === 'available') return <button className="btn small primary" onClick={() => updates.download()}>{t('appUpdate.download')}</button>;
  if (update.state === 'downloaded') return <button className="btn small primary" onClick={() => updates.install()}>{t('appUpdate.install')}</button>;
  return null;
}
