import type { Translator } from '../../shared/i18n';
import type { AppUpdate } from './types';

// The update state in words.
export function updateText(u: AppUpdate, version: string, { t }: Translator): string {
  switch (u.state) {
    case 'dev': return t('appUpdate.dev');
    case 'checking': return t('appUpdate.checking');
    case 'available': return t('appUpdate.available', { version: u.version || '' });
    case 'downloading': return t('appUpdate.downloading', { pct: u.pct || 0 });
    case 'downloaded': return t('appUpdate.downloaded', { version: u.version || '' });
    case 'latest': return t('appUpdate.latest', { version });
    case 'error': return t('appUpdate.error', { error: u.error || '' });
    default: return t('settings.version', { version });
  }
}
