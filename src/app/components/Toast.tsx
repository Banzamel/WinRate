import { useAppState } from '../hooks';

export function Toast() {
  const toast = useAppState((s) => s.toast);
  return toast ? <div className={`toast ${toast.tone}`}>{toast.text}</div> : null;
}
