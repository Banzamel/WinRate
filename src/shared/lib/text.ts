// Small text helpers shared by the components.

// Class names without the empty ones.
export const cls = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ');

// The message of an error for the user, without the "Error: " prefixes IPC adds.
export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e)).replace(/^.*Error: /, '');
