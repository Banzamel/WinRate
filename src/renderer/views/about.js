// About: the mathematics behind the app, in plain words, with sources.
import { t } from '../js/i18n.js';
import { el, card, mount } from '../js/ui.js';

const SOURCES = [
  ['Henze, N. (1997). A statistical and probabilistic analysis of popular lottery tickets. Statistica Neerlandica 51(2).', 'https://ideas.repec.org/a/bla/stanee/v51y1997i2p155-163.html'],
  ['Henze, N., Riedwyl, H. (1998). How to Win More: Strategies for Increasing a Lottery Win. A K Peters / CRC Press.', 'https://www.routledge.com/products/9780429073809'],
  ['Crack, T. F., Whigham, P. A. — popular Lotto lines and prize sharing (NZ Lotto).', 'https://www.1news.co.nz/2026/07/08/lotto-whats-better-a-lucky-dip-or-your-own-numbers/'],
  ['Eurojackpot — rules, draw days and odds.', 'https://www.euro-millions.com/eurojackpot'],
];

export function renderAbout(root) {
  mount(root, 
    el('h1', {}, t('nav.about')),
    ...['independence', 'filters', 'sharing', 'simulation', 'gambler'].map((k) => card(t(`about.${k}`), el('p', {}, t(`about.${k}.text`)))),
    card(t('about.sources'), el('ul', { class: 'plain' }, SOURCES.map(([label, url]) => el('li', {}, el('a', { href: '#', onClick: (e) => { e.preventDefault(); window.api.openExternal(url); } }, label))))),
    card(t('about.responsible'), el('p', {}, t('about.responsible.text'))),
  );
}
