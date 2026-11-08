// About: the mathematics behind the app, in plain words, with sources.
import { api } from '../backend/api';
import { t } from '../i18n';
import { Card } from '../ui';

const SOURCES: [string, string][] = [
  ['Henze, N. (1997). A statistical and probabilistic analysis of popular lottery tickets. Statistica Neerlandica 51(2).', 'https://ideas.repec.org/a/bla/stanee/v51y1997i2p155-163.html'],
  ['Henze, N., Riedwyl, H. (1998). How to Win More: Strategies for Increasing a Lottery Win. A K Peters / CRC Press.', 'https://www.routledge.com/products/9780429073809'],
  ['Crack, T. F., Whigham, P. A. — popular Lotto lines and prize sharing (NZ Lotto).', 'https://www.1news.co.nz/2026/07/08/lotto-whats-better-a-lucky-dip-or-your-own-numbers/'],
  ['Eurojackpot — rules, draw days and odds.', 'https://www.euro-millions.com/eurojackpot'],
];

export function AboutView() {
  return (
    <>
      <h1>{t('nav.about')}</h1>
      {['independence', 'filters', 'sharing', 'simulation', 'gambler'].map((k) => (
        <Card key={k} title={t(`about.${k}`)}><p>{t(`about.${k}.text`)}</p></Card>
      ))}
      <Card title={t('about.sources')}>
        <ul className="plain">
          {SOURCES.map(([label, url]) => <li key={url}><a href="#" onClick={(e) => { e.preventDefault(); api.openExternal(url); }}>{label}</a></li>)}
        </ul>
      </Card>
      <Card title={t('about.responsible')}><p>{t('about.responsible.text')}</p></Card>
    </>
  );
}
