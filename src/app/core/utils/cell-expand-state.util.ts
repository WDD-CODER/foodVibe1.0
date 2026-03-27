import { signal } from '@angular/core'

/**
 * Reusable expand-all + per-row-expand state for dense chip columns.
 * Plain class — NOT an injectable service. Instantiate inline in the component.
 */
export class CellExpandState {
  readonly expandAll_ = signal(false)
  readonly expandedIds_ = signal<Set<string>>(new Set())

  isExpanded(id: string): boolean {
    return this.expandAll_() || this.expandedIds_().has(id)
  }

  toggleOne(id: string): void {
    this.expandedIds_.update(set => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  toggleAll(): void {
    this.expandAll_.update(v => !v)
    this.expandedIds_.set(new Set())
  }

  closeAll(): void {
    this.expandAll_.set(false)
    this.expandedIds_.set(new Set())
  }

  reset(): void {
    this.closeAll()
  }
}
