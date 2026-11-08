import { useEffect, useRef } from 'react';
import { cls } from '../lib/text';

interface Props { value: number | null | undefined; min?: number; max?: number; step?: number; className?: string; onChange: (v: number | null) => void }

// Number field that reports on commit (Enter, blur, spinner arrows) like the native change event,
// so a half-typed number does not start a recomputation.
export function NumberInput({ value, min, max, step = 1, className = '', onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const handler = useRef(onChange);
  handler.current = onChange;
  useEffect(() => {
    const input = ref.current;
    if (!input) return undefined;
    const fire = () => handler.current(input.value === '' ? null : Number(input.value));
    input.addEventListener('change', fire);
    return () => input.removeEventListener('change', fire);
  }, []);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) ref.current.value = value == null ? '' : String(value);
  }, [value]);
  return <input ref={ref} type="number" className={cls('num', className)} defaultValue={value ?? ''} min={min} max={max} step={step} />;
}
