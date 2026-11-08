import { useSyncExternalStore } from 'react';
import type { Store } from '../lib/Store';

// Re-renders when the selected part of the store changes. The selector must return a part of the
// state (or a primitive), not a new object, or the component would re-render on every change.
export function useStore<T extends object, R>(store: Store<T>, select: (state: T) => R): R {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}
