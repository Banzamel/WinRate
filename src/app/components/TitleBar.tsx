// Title bar of the frameless window: drag region, running jobs, window buttons.
import logo from '../../assets/logo.svg';
import { useJobs } from '../../features/analysis';
import { useI18n } from '../../shared/i18n';
import { useServices } from '../hooks';

function JobPills() {
  const { t } = useI18n();
  const jobs = useJobs();
  const running = Object.entries(jobs).filter(([, j]) => j && j.progress < 1);
  return <div className="titlebar-status">{running.map(([lane, j]) => <span key={lane} className="job-pill">{`${t(`lane.${lane}`)} ${Math.round((j?.progress || 0) * 100)}%`}</span>)}</div>;
}

export function TitleBar() {
  const { t } = useI18n();
  const { platform } = useServices();
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region><img className="brand-logo" src={logo} alt="" />{t('app.name')}</div>
      <JobPills />
      <div className="window-controls">
        <button onClick={() => platform.window.run('minimize')} title={t('window.minimize')}>&#x2013;</button>
        <button onClick={() => platform.window.run('maximize')} title={t('window.maximize')}>&#x25A1;</button>
        <button className="close" onClick={() => platform.window.run('close')} title={t('window.close')}>&#x2715;</button>
      </div>
    </header>
  );
}
