import type { Draw } from '../../../core/games';
import type { Report } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint } from '../../../shared/ui';
import { BiasPool } from './BiasPool';

// Physics: are some balls more likely, did anything change over time, does the machine remember?
export function BiasCard({ report, era }: { report: Report; era: Draw[] }) {
  const { t } = useI18n();
  const several = report.bias.length > 1;
  return (
    <Card title={t('bias.title')}>
      <Hint text={t('bias.intro')} />
      {report.bias.map((b, i) => (b ? <BiasPool key={i} bias={b} extra={i > 0} era={era} title={several ? t(i ? 'bias.extraPool' : 'bias.mainPool') : null} /> : null))}
      <Hint text={t('bias.hint')} />
    </Card>
  );
}
