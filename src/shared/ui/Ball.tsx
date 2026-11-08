import { cls } from '../lib/text';

// A lottery ball: main numbers gold, extra-pool (Euro) numbers blue.
export function Ball({ n, extra = false, small = false, hit = false }: { n: number; extra?: boolean; small?: boolean; hit?: boolean }) {
  return <span className={cls('ball', extra && 'extra', small && 'small', hit && 'hit')}>{n}</span>;
}
