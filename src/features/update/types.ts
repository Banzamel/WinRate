export type UpdateState = 'dev' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'latest' | 'error';

export interface AppUpdate { state: UpdateState; version?: string; pct?: number; error?: string }
