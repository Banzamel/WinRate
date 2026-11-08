import { useI18n } from '../../shared/i18n';
import { cls } from '../../shared/lib/text';
import { useAppState, useServices } from '../hooks';
import { NavIcon } from './NavIcon';

const NAV = ['lotto', 'eurojackpot', 'about', 'settings'];

export function Sidebar() {
  const { t } = useI18n();
  const { store } = useServices();
  const view = useAppState((s) => s.view);
  const games = useAppState((s) => s.games);
  const version = useAppState((s) => s.version);
  return (
    <nav className="sidebar">
      {NAV.map((name) => (
        <button key={name} className={cls('nav-btn', view === name && 'active')} onClick={() => store.set({ view: name })}>
          <NavIcon name={name} />
          <span>{games[name] ? games[name].name : t(`nav.${name}`)}</span>
        </button>
      ))}
      <div className="nav-foot">{`v${version}`}</div>
    </nav>
  );
}
