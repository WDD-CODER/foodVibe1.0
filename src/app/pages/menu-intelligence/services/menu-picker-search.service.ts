import { Injectable, signal } from '@angular/core'

/** Picker instance key — a section index, or "sectionIndex-itemIndex" for a dish row. */
export type PickerSearchKey = string | number

export interface PickerKeydownOptions {
  /** Number of selectable options currently in the dropdown. */
  optionCount: number
  /** Enter (or Space with `selectOnSpace`) on the highlighted option; index is clamped to the list. */
  onSelect: (index: number) => void
  /** Escape. */
  onClose: () => void
  /** After ArrowUp/ArrowDown moved the highlight (e.g. scroll it into view). */
  onHighlightMove?: () => void
  /** Tab / Shift+Tab focus hand-off; default is prevented before it runs. */
  onTab?: (e: KeyboardEvent) => void
  /** Space selects like Enter (dish search only). */
  selectOnSpace?: boolean
}

/** Keyed query + highlighted-index state and the arrow/Enter/Escape/Tab handling for one picker kind. */
export class KeyedPickerSearch {
  private readonly queries_ = signal<Record<string, string>>({})
  private readonly highlighted_ = signal<Record<string, number>>({})

  query(key: PickerSearchKey): string {
    return this.queries_()[key] ?? ''
  }

  highlighted(key: PickerSearchKey): number {
    return this.highlighted_()[key] ?? 0
  }

  setQuery(key: PickerSearchKey, value: string): void {
    this.queries_.update((q) => ({ ...q, [key]: value }))
  }

  setHighlighted(key: PickerSearchKey, index: number): void {
    this.highlighted_.update((m) => ({ ...m, [key]: index }))
  }

  /** Typing resets the highlight to the first option. */
  onQueryChange(key: PickerSearchKey, value: string): void {
    this.setQuery(key, value)
    this.setHighlighted(key, 0)
  }

  handleKeydown(key: PickerSearchKey, e: KeyboardEvent, opts: PickerKeydownOptions): void {
    const count = opts.optionCount
    const idx = this.highlighted(key)

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      const next = e.key === 'ArrowDown' ? (count > 0 ? Math.min(idx + 1, count - 1) : 0) : Math.max(0, idx - 1)
      this.setHighlighted(key, next)
      opts.onHighlightMove?.()
      return
    }
    if (e.key === 'Enter' || (opts.selectOnSpace && e.key === ' ')) {
      if (count > 0) {
        e.preventDefault()
        e.stopPropagation()
        opts.onSelect(Math.min(idx, count - 1))
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      opts.onClose()
      return
    }
    if (e.key === 'Tab' && opts.onTab) {
      e.preventDefault()
      e.stopPropagation()
      opts.onTab(e)
    }
  }
}

/** Page-scoped search state for the menu page's dish and section-category pickers. */
@Injectable()
export class MenuPickerSearchService {
  readonly dish = new KeyedPickerSearch()
  readonly section = new KeyedPickerSearch()
}
