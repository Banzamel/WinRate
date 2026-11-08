import type { DrawError } from '../../core/history';

// Result of a history change (download, import, manual entry) for the messages.
export interface HistoryChange { added: number; changed: number; total: number; skipped?: number; url?: string; file?: string; error?: string }

export interface ManualResult { error?: DrawError; change?: HistoryChange }

// Progress of the automatic download at start, per game.
export interface AutoRefreshEvent { game: string; state: 'downloading' | 'done' | 'error'; added?: number; changed?: number; total?: number; error?: string }
