// How components reach the app: the services (classes, created once at boot) and the store.
import { createContext, useContext } from 'react';
import { useStore } from '../shared/hooks/useStore';
import type { AppState } from './state/AppState';
import type { Services } from './services';

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('ServicesContext is missing');
  return services;
}

export function useAppState<R>(select: (state: AppState) => R): R {
  return useStore(useServices().store, select);
}

// Advanced mode shows the scientific extras (physics, patterns, backtests…); off by default.
export const useAdvanced = (): boolean => useAppState((s) => !!s.settings.advanced);

// Half-done input (picked numbers, a result) that survives switching tabs, kept in the store.
export function useDraft<T>(key: string, initial: () => T): [T, (next: T) => void] {
  const { store } = useServices();
  const saved = useAppState((s) => s.drafts[key] as T | undefined);
  return [saved ?? initial(), (next: T) => store.setDraft(key, next)];
}
