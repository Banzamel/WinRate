import { splitConfig, type FilterConfig } from '../../core/filters';

// Identity of a census of the history-independent filters (shared by the worker and the cache).
export const censusKey = (gameId: string, config: FilterConfig): string => `${gameId}:${JSON.stringify(splitConfig(config).fixed)}`;
