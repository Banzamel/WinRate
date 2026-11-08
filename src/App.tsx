// App frame: title bar (frameless window), update banner, navigation, the current view and the toast.
import { useEffect } from 'react';
import { api } from './backend/api';
import { t } from './i18n';
import { state, useStore, notify } from './store';
import { GameView } from './views/Game';
import { SettingsView } from './views/Settings';
import { AboutView } from './views/About';
import { UpdateBanner } from './views/Update';
import logo from './img/logo.svg';

const NAV = ['lotto', 'eurojackpot', 'about', 'settings'];

const ICONS: Record<string, React.ReactNode> = {
  lotto: <><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">6</text></>,
  eurojackpot: <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />,
  about: <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7" />,
  settings: <><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" /><path fill="none" stroke="currentColor" strokeWidth="1.6" d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>,
};

// Running background jobs as pills in the title bar.
function JobPills() {
  useStore('jobs');
  const running = Object.entries(state.jobs).filter(([, j]) => j && j.progress < 1);
  return <div className="titlebar-status">{running.map(([lane, j]) => <span key={lane} className="job-pill">{`${t(`lane.${lane}`)} ${Math.round((j!.progress) * 100)}%`}</span>)}</div>;
}

function TitleBar() {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region><img className="brand-logo" src={logo} alt="" />{t('app.name')}</div>
      <JobPills />
      <div className="window-controls">
        <button onClick={() => api.window('minimize')} title={t('window.minimize')}>&#x2013;</button>
        <button onClick={() => api.window('maximize')} title={t('window.maximize')}>&#x25A1;</button>
        <button className="close" onClick={() => api.window('close')} title={t('window.close')}>&#x2715;</button>
      </div>
    </header>
  );
}

function Toast() {
  const toast = state.toast;
  if (!toast) return null;
  return <div className={`toast ${toast.tone}`}>{toast.text}</div>;
}

export function App() {
  useStore();
  // The window is created hidden and shown once the first frame is ready (no white flash).
  useEffect(() => { api.show(); }, []);
  const go = (view: string) => { state.view = view; notify(); };
  return (
    <>
      <TitleBar />
      <UpdateBanner />
      <div className="shell">
        <nav className="sidebar">
          {NAV.map((name) => (
            <NavButton key={name} name={name} onClick={() => go(name)} />
          ))}
          <div className="nav-foot">{`v${state.version}`}</div>
        </nav>
        <main className="view">
          {state.games[state.view] ? <GameView key={state.view} id={state.view} /> : state.view === 'settings' ? <SettingsView /> : <AboutView />}
        </main>
      </div>
      <Toast />
    </>
  );
}

function NavButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button className={`nav-btn ${state.view === name ? 'active' : ''}`} onClick={onClick}>
      <svg viewBox="0 0 24 24">{ICONS[name]}</svg>
      <span>{state.games[name] ? state.games[name].name : t(`nav.${name}`)}</span>
    </button>
  );
}
