import type { ReactNode } from 'react';
import { cls } from '../lib/text';

// A table from a header and rows of cells.
export function Table({ header, rows, className = '' }: { header: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <table className={cls('table', className)}>
      <thead><tr>{header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}
