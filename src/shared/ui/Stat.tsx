import type { ReactNode } from 'react';

// A labelled figure in a tile.
export function Stat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {sub ? <span className="stat-sub">{sub}</span> : null}
    </div>
  );
}
