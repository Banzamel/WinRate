import type { ReactNode } from 'react';

const ICONS: Record<string, ReactNode> = {
  lotto: <><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">6</text></>,
  eurojackpot: <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />,
  about: <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7" />,
  settings: <><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" /><path fill="none" stroke="currentColor" strokeWidth="1.6" d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>,
};

export function NavIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24">{ICONS[name]}</svg>;
}
