// App frame: title bar, update banner, navigation, the current view and the toast.
import { useEffect } from 'react';
import { AboutView } from '../features/about';
import { GameView } from '../features/game';
import { SettingsView } from '../features/settings';
import { UpdateBanner } from '../features/update';
import { I18nProvider } from '../shared/i18n';
import { Sidebar } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { Toast } from './components/Toast';
import { useAppState, useServices } from './hooks';
import { useAutoRefresh } from './useAutoRefresh';

function CurrentView() {
  const view = useAppState((s) => s.view);
  const isGame = useAppState((s) => !!s.games[s.view]);
  if (isGame) return <GameView key={view} id={view} />;
  return view === 'settings' ? <SettingsView /> : <AboutView />;
}

function Shell() {
  const { platform } = useServices();
  useAutoRefresh();
  // The window is created hidden and shown once the first frame is ready (no white flash).
  useEffect(() => { platform.window.show(); }, [platform]);
  return (
    <>
      <TitleBar />
      <UpdateBanner />
      <div className="shell">
        <Sidebar />
        <main className="view"><CurrentView /></main>
      </div>
      <Toast />
    </>
  );
}

export function App() {
  const lang = useAppState((s) => s.settings.language);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return <I18nProvider lang={lang}><Shell /></I18nProvider>;
}
