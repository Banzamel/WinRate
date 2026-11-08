import type { PatternStat } from '../../core/stats';
import type { CompareRow } from '../../shared/ui';

// Groups a wide distribution (sum, spread) into buckets of `width`; drops the empty tails.
export function bucketize(p: PatternStat, width: number): CompareRow[] {
  const rows: (CompareRow & { key: number })[] = [];
  p.values.forEach((v, i) => {
    const key = Math.floor(v / width) * width;
    let row = rows[rows.length - 1];
    if (!row || row.key !== key) { row = { key, label: `${key}–${key + width - 1}`, observed: 0, expected: 0 }; rows.push(row); }
    row.observed += p.observed[i];
    row.expected += p.expected[i];
  });
  return rows.filter((r) => r.expected >= 0.05 || r.observed);
}
