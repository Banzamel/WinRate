// The window's title bar (the shared one in src/shared/ui/titlebar) with the running jobs.
import logo from '../../assets/logo.svg';
import { useJobs } from '../../features/analysis';
import { useI18n } from '../../shared/i18n';
import { TitleBar as SharedTitleBar } from '../../shared/ui/titlebar';
import { useServices } from '../hooks';

function JobPills() {
  const { t } = useI18n();
  const jobs = useJobs();
  const running = Object.entries(jobs).filter(([, j]) => j && j.progress < 1);
  return <>{running.map(([lane, j]) => <span key={lane} className="job-pill">{`${t(`lane.${lane}`)} ${Math.round((j?.progress || 0) * 100)}%`}</span>)}</>;
}

export function TitleBar() {
  const { t } = useI18n();
  const { platform } = useServices();
  const labels = { minimize: t('window.minimize'), maximize: t('window.maximize'), restore: t('window.restore'), close: t('window.close') };
  return (
    <SharedTitleBar icon={<img src={logo} alt="" />} name={t('app.name')} labels={labels} frame={platform.window}>
      <JobPills />
    </SharedTitleBar>
  );
}
