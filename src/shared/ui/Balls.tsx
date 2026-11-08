import { Ball } from './Ball';

// The balls of a ticket or draw; the pools after the first are extra (Euro) numbers.
// hits: numbers to mark as matched, per pool.
export function Balls({ pools, small, hits }: { pools: number[][]; small?: boolean; hits?: number[][] }) {
  return (
    <span className="balls">
      {pools.map((nums, i) => nums.map((n, j) => <Ball key={`${i}-${j}`} n={n} small={small} extra={i > 0} hit={!!hits?.[i]?.includes(n)} />))}
    </span>
  );
}
