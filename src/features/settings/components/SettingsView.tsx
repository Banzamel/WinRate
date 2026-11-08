// Settings: language, mode, app updates and data.
import { useAppState, useServices } from '../../../app/hooks';
import { LANGUAGES, useI18n } from '../../../shared/i18n';
import { Card, Hint, Select } from '../../../shared/ui';
import { UpdateSection } from '../../update';

export function SettingsView() {
  const { t } = useI18n();
  const { settings: service } = useServices();
  const s = useAppState((state) => state.settings);
  return (
    <>
      <h1>{t('nav.settings')}</h1>
      <Card title={t('settings.language')}>
        <Select value={s.language || 'pl'} options={LANGUAGES.map((l): [string, string] => [l, t(`language.${l}`)])} onChange={(v) => service.set({ language: v })} />
        <Hint text={t('settings.languageHint')} />
      </Card>
      <Card title={t('settings.mode')}>
        <label className="check"><input type="checkbox" checked={!!s.advanced} onChange={(e) => service.set({ advanced: e.target.checked })} />{t('settings.advanced')}</label>
        <Hint text={t('settings.advancedHint')} />
      </Card>
      <Card title={t('settings.appUpdate')}>
        <UpdateSection />
        <Hint text={t('settings.appUpdateHint')} />
      </Card>
      <Card title={t('settings.data')}>
        <label className="check"><input type="checkbox" checked={s.autoHistory !== false} onChange={(e) => service.set({ autoHistory: e.target.checked })} />{t('settings.autoHistory')}</label>
        <Hint text={t('settings.dataHint')} />
      </Card>
    </>
  );
}
