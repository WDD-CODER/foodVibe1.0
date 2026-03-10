const STORAGE_PREFIX = 'list-panel:';

/**
 * Reads the saved "panel open" state for a given context (e.g. 'inventory', 'venues').
 * Defaults to true if missing or invalid so lists start with the filter panel open.
 */
export function getPanelOpen(context: string): boolean {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_PREFIX + context) : null;
    if (raw === null) return true;
    const value = JSON.parse(raw);
    return value === true;
  } catch {
    return true;
  }
}

/**
 * Persists the "panel open" state for a given context so it is restored when the user returns.
 */
export function setPanelOpen(context: string, open: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PREFIX + context, JSON.stringify(open));
    }
  } catch {
    /* ignore */
  }
}
