// History actions with their messages, shared by the buttons of the History tab.
import { useServices } from '../../../app/hooks';
import type { Draw } from '../../../core/games';
import { useI18n } from '../../../shared/i18n';
import type { HistoryChange } from '../types';

export function useHistoryActions(id: string) {
  const { t, num, date } = useI18n();
  const { history, toaster, platform } = useServices();
  const report = (res: HistoryChange | null, okKey: string) => {
    if (!res) return;
    if (res.error) { toaster.show(t('history.error', { error: res.error }), 'bad'); return; }
    toaster.show(t(okKey, { added: num(res.added), changed: num(res.changed), total: num(res.total), skipped: num(res.skipped || 0) }), 'good');
  };
  return {
    download: async () => report(await history.download(id), 'history.downloaded'),
    importFile: async () => report(await history.importFile(id), 'history.imported'),
    exportFile: async () => {
      const r = await history.exportFile(id);
      if (r) toaster.show(t('history.exported', { count: num(r.count) }), 'good');
    },
    add: async (draw: Draw) => {
      const res = await history.add(id, draw);
      if (res.error) toaster.show(t(`history.invalid.${res.error}`), 'bad'); else report(res.change || null, 'history.added');
    },
    remove: async (draw: Draw) => {
      if (!(await platform.dialogs.confirm(t('history.removeConfirm', { date: date(draw.date) })))) return;
      if (await history.remove(id, draw.date, draw.pools)) toaster.show(t('history.removed', { total: num(history.list(id).length) }), 'good');
    },
  };
}
