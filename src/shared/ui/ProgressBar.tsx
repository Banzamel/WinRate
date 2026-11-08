import { useI18n } from '../i18n';

export function ProgressBar({ value, label }: { value: number; label?: string | null }) {
  const { pct } = useI18n();
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      <span>{label || pct(value, 0)}</span>
    </div>
  );
}
