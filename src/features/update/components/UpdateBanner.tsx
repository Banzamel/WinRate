import { useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { updateText } from '../updateText';
import { UpdateActions } from './UpdateActions';

const SHOWN = ['available', 'downloading', 'downloaded'];

// The bar under the title bar while an update is on offer.
export function UpdateBanner() {
  const i18n = useI18n();
  const update = useAppState((s) => s.appUpdate);
  const version = useAppState((s) => s.version);
  if (!SHOWN.includes(update.state)) return null;
  return <div className="update-banner"><span>{updateText(update, version, i18n)}</span><UpdateActions update={update} /></div>;
}
