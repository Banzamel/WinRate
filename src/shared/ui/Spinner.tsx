import { useI18n } from '../i18n';

export function Spinner({ text }: { text?: string }) {
  const { t } = useI18n();
  return <div className="loading"><span className="spin" />{text || t('common.working')}</div>;
}
