// About: the mathematics behind the app, in plain words, with sources.
import { useServices } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Card } from '../../../shared/ui';
import { SOURCES, TOPICS } from '../sources';

export function AboutView() {
  const { t } = useI18n();
  const { platform } = useServices();
  return (
    <>
      <h1>{t('nav.about')}</h1>
      {TOPICS.map((k) => <Card key={k} title={t(`about.${k}`)}><p>{t(`about.${k}.text`)}</p></Card>)}
      <Card title={t('about.sources')}>
        <ul className="plain">
          {SOURCES.map(([label, url]) => <li key={url}><a href="#" onClick={(e) => { e.preventDefault(); platform.openExternal(url); }}>{label}</a></li>)}
        </ul>
      </Card>
      <Card title={t('about.responsible')}><p>{t('about.responsible.text')}</p></Card>
    </>
  );
}
