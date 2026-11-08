import { useI18n } from '../i18n';

// Explanations stay folded under "more" so the screens show results, not paragraphs.
export function Hint({ text }: { text: string }) {
  const { t } = useI18n();
  return <details className="info"><summary>{t('common.more')}</summary><p>{text}</p></details>;
}
