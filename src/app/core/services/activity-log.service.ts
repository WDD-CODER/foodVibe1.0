import { Injectable, signal } from '@angular/core';

export type ActivityAction = 'created' | 'updated' | 'deleted';
export type ActivityEntityType = 'product' | 'recipe' | 'dish';

export interface ActivityChange {
  /** Logical field key, e.g. 'price', 'unit', 'category', 'name' */
  field: string;
  /** Translation key or display label for the field, e.g. 'activity_field_price' */
  label: string;
  /** Old value (already formatted for display) */
  from?: string;
  /** New value (already formatted for display) */
  to?: string;
}

export interface ActivityEntry {
  id: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  timestamp: number;
  /** Human-readable summary of what changed (legacy). */
  details?: string;
  /** Structured change list for precise UI tags/popovers. */
  changes?: ActivityChange[];
}

const ACTIVITY_STORAGE_KEY = 'activity_log';
const MAX_ACTIVITY_ENTRIES = 100;

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private readonly activityLogInternal_ = signal<ActivityEntry[]>(this.hydrateFromStorage());

  /** Readonly view so consumers always see latest when they read. */
  readonly activityLog_ = this.activityLogInternal_.asReadonly();

  /** Re-read from localStorage and update the signal. Call when the dashboard is shown so the list reflects current storage. */
  syncFromStorage(): void {
    const entries = this.hydrateFromStorage();
    this.activityLogInternal_.set(entries);
  }

  /**
   * Read the most recent activity entries directly from localStorage.
   * Use this for display so the list always reflects current storage (e.g. after user clears it in DevTools).
   */
  getRecentEntriesFromStorage(maxItems = 10): ActivityEntry[] {
    const entries = this.hydrateFromStorage();
    return [...entries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems);
  }

  recordActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
    const nextEntry: ActivityEntry = {
      ...entry,
      id: `${entry.entityType}-${entry.entityId || 'new'}-${Date.now()}`,
      timestamp: Date.now(),
    };

    const current = this.activityLogInternal_();
    const updated = [nextEntry, ...current].slice(0, MAX_ACTIVITY_ENTRIES);

    this.activityLogInternal_.set(updated);
    this.persistToStorage(updated);
  }

  private hydrateFromStorage(): ActivityEntry[] {
    try {
      const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ActivityEntry[];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  private persistToStorage(entries: ActivityEntry[]): void {
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore storage errors (e.g., SSR or quota issues)
    }
  }
}

