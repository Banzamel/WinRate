// Settings: language, mode, app updates and data.
import { t, LANGUAGES, setLanguage } from '../i18n';
import { state, setSetting } from '../store';
import { Card, Hint, Select } from '../ui';
import { UpdateSection } from './Update';

export function SettingsView() {
  const s = state.settings;
  return (
    <>
      <h1>{t('nav.settings')}</h1>
      <Card title={t('settings.language')}>
        <Select value={s.language || 'pl'} options={LANGUAGES.map((l) => [l, t(`language.${l}`)])} onChange={(v) => { setLanguage(v); setSetting({ language: v }); }} />
        <Hint text={t('settings.languageHint')} />
      </Card>
      <Card title={t('settings.mode')}>
        <label className="check"><input type="checkbox" checked={!!s.advanced} onChange={(e) => setSetting({ advanced: e.target.checked })} />{t('settings.advanced')}</label>
        <Hint text={t('settings.advancedHint')} />
      </Card>
      <Card title={t('settings.appUpdate')}>
        <UpdateSection />
        <Hint text={t('settings.appUpdateHint')} />
      </Card>
      <Card title={t('settings.data')}>
        <label className="check"><input type="checkbox" checked={s.autoHistory !== false} onChange={(e) => setSetting({ autoHistory: e.target.checked })} />{t('settings.autoHistory')}</label>
        <Hint text={t('settings.dataHint')} />
      </Card>
    </>
  );
}
