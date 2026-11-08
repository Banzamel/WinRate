// New results are downloaded once at start (unless switched off), with a message per game.
import { useEffect } from 'react';
import { useI18n } from '../shared/i18n';
import { useServices } from './hooks';

export function useAutoRefresh(): void {
  const { history, settings, store, toaster } = useServices();
  const { t } = useI18n();
  useEffect(() => {
    if (settings.get().autoHistory === false) return;
    history.refreshAll((e) => {
      const name = store.get().games[e.game].name;
      if (e.state === 'error') toaster.show(t('history.autoError', { game: name, error: e.error || '' }), 'bad');
      else if (e.state === 'done' && (e.added || e.changed)) toaster.show(t('history.autoDone', { game: name, added: e.added || 0, total: e.total || 0 }), 'good');
    });
    // Once per start, in the language of the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
