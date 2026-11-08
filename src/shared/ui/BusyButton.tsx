import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cls } from '../lib/text';

// A button that shows the app is working: disabled and spinning until the async handler finishes.
export function BusyButton({ className = 'btn', disabled, onClick, children }: { className?: string; disabled?: boolean; onClick: () => Promise<unknown> | void; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const click = async () => {
    if (busy) return;
    setBusy(true);
    try { await onClick(); } finally { if (mounted.current) setBusy(false); }
  };
  return (
    <button className={cls(className, busy && 'busy')} disabled={disabled || busy} onClick={click}>
      {busy ? <span className="spin" /> : null}{children}
    </button>
  );
}
