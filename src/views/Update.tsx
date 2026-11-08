// App self-update UI: the banner under the title bar and the section in Settings.
import { api } from '../backend/api';
import { t } from '../i18n';
import { state } from '../store';
import type { AppUpdate } from '../types';

function Actions({ u }: { u: AppUpdate }) {
  if (u.state === 'available') return <button className="btn small primary" onClick={() => api.downloadAppUpdate()}>{t('appUpdate.download')}</button>;
  if (u.state === 'downloaded') return <button className="btn small primary" onClick={() => api.installAppUpdate()}>{t('appUpdate.install')}</button>;
  return null;
}

export function updateText(u: AppUpdate) {
  switch (u.state) {
    case 'dev': return t('appUpdate.dev');
    case 'checking': return t('appUpdate.checking');
    case 'available': return t('appUpdate.available', { version: u.version || '' });
    case 'downloading': return t('appUpdate.downloading', { pct: u.pct || 0 });
    case 'downloaded': return t('appUpdate.downloaded', { version: u.version || '' });
    case 'latest': return t('appUpdate.latest', { version: state.version });
    case 'error': return t('appUpdate.error', { error: u.error || '' });
    default: return t('settings.version', { version: state.version });
  }
}

export function UpdateBanner() {
  const u = state.appUpdate || { state: 'idle' };
  if (!['available', 'downloading', 'downloaded'].includes(u.state)) return null;
  return <div className="update-banner"><span>{updateText(u)}</span><Actions u={u} /></div>;
}

export function UpdateSection() {
  const u = state.appUpdate || { state: 'idle' };
  return (
    <div>
      <p>{updateText(u)}</p>
      <div className="row-actions">
        <button className="btn" disabled={u.state === 'dev' || u.state === 'checking' || u.state === 'downloading'} onClick={() => api.checkAppUpdate()}>{t('appUpdate.check')}</button>
        <Actions u={u} />
      </div>
    </div>
  );
}
