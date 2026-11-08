import { useNow } from '../../../shared/hooks/useNow';
import { useI18n } from '../../../shared/i18n';

// Countdown to a draw: "2 d 04:13:09".
export function Countdown({ iso }: { iso: string }) {
  const { t } = useI18n();
  const now = useNow();
  const s = Math.floor(Math.max(0, new Date(iso).getTime() - now) / 1000);
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0')).join(':');
  return <strong>{d ? `${d} ${t('common.daysShort')} ${hms}` : hms}</strong>;
}
