import { useI18n } from '../i18n';
import { cls } from '../lib/text';

// Sub-tabs; the labels are the translations of tab.<id>.
export function Tabs({ items, active, onSelect }: { items: string[]; active: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="tabs">
      {items.map((id) => <button key={id} className={cls('tab', id === active && 'active')} onClick={() => onSelect(id)}>{t(`tab.${id}`)}</button>)}
    </div>
  );
}
