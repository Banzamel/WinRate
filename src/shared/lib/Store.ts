// A small observable store: immutable state replaced by shallow patches, for useSyncExternalStore.
export type Patch<T> = Partial<T> | ((state: T) => Partial<T>);

export class Store<T extends object> {
  private listeners = new Set<() => void>();

  constructor(private state: T) {}

  get = (): T => this.state;

  set(patch: Patch<T>): void {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((fn) => fn());
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
}
