import type { WritableSignal } from '@angular/core'
import { normalizeHebrew } from './recipe-match.util'

/** The page's own list-view signals; sort is optional (venue and supplier lists have none). */
export interface ListControlsSignals<F extends string> {
  search: WritableSignal<string>
  sortBy?: WritableSignal<F | null>
  sortOrder?: WritableSignal<'asc' | 'desc'>
}

export interface ListControls<F extends string> {
  /** Search clear (X) — same effect as deleting the text; keeps focus in the field (plan 363). */
  onClearSearch(input: HTMLInputElement): void
  /** Escape in a non-empty search clears it, like the X (plan 363). */
  onSearchEscape(event: Event, input: HTMLInputElement): void
  /** Clicking the active column flips the order; a new column starts ascending. */
  setSort(field: F): void
  /** Runs every resetter; the page passes the setters of its own filter signals. */
  clearAll(...resetters: Array<() => void>): void
}

/** One home for the search/sort/clear handlers every list page used to copy (plan 453). */
export function useListControls<F extends string>(signals: ListControlsSignals<F>): ListControls<F> {
  const onClearSearch = (input: HTMLInputElement): void => {
    signals.search.set('')
    input.focus()
  }
  return {
    onClearSearch,
    onSearchEscape(event: Event, input: HTMLInputElement): void {
      if (!signals.search()) return
      event.preventDefault()
      event.stopPropagation()
      onClearSearch(input)
    },
    setSort(field: F): void {
      const { sortBy, sortOrder } = signals
      if (!sortBy || !sortOrder) return
      if (sortBy() === field) {
        sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'))
      } else {
        sortBy.set(field)
        sortOrder.set('asc')
      }
    },
    clearAll(...resetters: Array<() => void>): void {
      for (const reset of resetters) reset()
    }
  }
}

/**
 * True when the query is empty, or any of the texts contains it. Both sides go through
 * `normalizeHebrew`, so niqqud, punctuation and letter case do not break a match.
 */
export function matchesSearch(query: string, ...texts: Array<string | null | undefined>): boolean {
  const needle = normalizeHebrew(query)
  if (!needle) return true
  return texts.some((text) => normalizeHebrew(text ?? '').includes(needle))
}
