import { signal, computed } from '@angular/core';

/**
 * Reusable selection state for list-shell tables.
 * Use one instance per list component. Supports row toggle, select all / deselect all for header checkbox.
 */
export class ListSelectionState {
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly selectionMode = computed(() => this.selectedIds().size > 0);

  toggle(id: string): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  clear(): void {
    this.selectedIds.set(new Set());
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  /** Set selection to exactly the given ids (e.g. all visible/filtered item ids). */
  selectAll(ids: string[]): void {
    this.selectedIds.set(new Set(ids));
  }

  /** True if every id in the given list is selected. */
  allSelected(ids: string[]): boolean {
    if (ids.length === 0) return false;
    const set = this.selectedIds();
    return ids.every((id) => set.has(id));
  }

  /** True if at least one id in the given list is selected. */
  someSelected(ids: string[]): boolean {
    const set = this.selectedIds();
    return ids.some((id) => set.has(id));
  }

  /**
   * Toggle select-all: if all visible ids are selected, clear; otherwise select all visible.
   * Call from header checkbox click.
   */
  toggleSelectAll(visibleIds: string[]): void {
    if (this.allSelected(visibleIds)) {
      this.clear();
    } else {
      this.selectAll(visibleIds);
    }
  }
}
