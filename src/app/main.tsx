// Entry: creates the services, loads settings and history, renders the app.
import { createRoot } from 'react-dom/client';
import { createPlatform } from '../platform';
import '../styles/index.css';
import { App } from './App';
import { ServicesContext } from './hooks';
import { createServices } from './services';

declare const __APP_VERSION__: string;

async function boot() {
  const platform = createPlatform({ updates: !import.meta.env.DEV });
  const services = createServices(platform, __APP_VERSION__);
  await services.settings.load();
  await services.history.open();
  services.updates.scheduleCheck();
  const root = document.getElementById('root');
  if (!root) throw new Error('#root is missing');
  createRoot(root).render(<ServicesContext.Provider value={services}><App /></ServicesContext.Provider>);
}

boot();
