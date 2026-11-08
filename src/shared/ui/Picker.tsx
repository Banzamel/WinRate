import { cls } from '../lib/text';

// The numbers of a pool laid out like a coupon; clicking toggles a number.
export function Picker({ size, chosen, extra = false, onToggle }: { size: number; chosen: number[]; extra?: boolean; onToggle: (n: number) => void }) {
  return (
    <div className="picker">
      {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
        <button key={n} className={cls('ball pick', extra && 'extra-pick', chosen.includes(n) && 'on')} onClick={() => onToggle(n)}>{n}</button>
      ))}
    </div>
  );
}

// The chosen numbers after toggling n, at most `limit` of them, sorted.
export function toggleNumber(chosen: number[], n: number, limit = Infinity): number[] {
  if (chosen.includes(n)) return chosen.filter((x) => x !== n);
  return chosen.length < limit ? [...chosen, n].sort((a, b) => a - b) : chosen;
}
