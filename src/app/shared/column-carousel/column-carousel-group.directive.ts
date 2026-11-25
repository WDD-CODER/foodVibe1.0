import { Directive, computed, model, signal } from '@angular/core'

/**
 * Shared state for one list's mobile column carousel (plan 349). Put it on the element that
 * wraps both the header and the rows (the `<app-list-shell>` in each list page); every
 * `app-column-carousel-header` / `app-column-carousel-cell` inside injects it, so the header
 * and all rows move together with no per-page wiring. `[(columnCarouselIndex)]` is optional
 * (e.g. to persist the slide).
 */
@Directive({
  selector: '[appColumnCarouselGroup]',
  standalone: true,
  exportAs: 'columnCarouselGroup'
})
export class ColumnCarouselGroupDirective {
  /** Active slide; two-way bindable. */
  readonly columnCarouselIndex = model(0)

  /**
   * Ids of the columns that fell into the switching column (plan 745), set by `app-list-shell` when the list
   * declares its columns. `null` = today's phone-only mode, where the slides are the count.
   */
  readonly collapsed = signal<readonly string[] | null>(null)

  private readonly count_ = signal(0)
  private readonly slideCount = computed(() => {
    const collapsed = this.collapsed()
    return collapsed ? collapsed.length : this.count_()
  })
  /** Number of slides (reported by the header / cells); in measured mode the number of collapsed columns. */
  readonly count = this.slideCount

  /** Active slide, clamped to the current slide count. */
  readonly index = computed(() => {
    const count = this.slideCount()
    const raw = this.columnCarouselIndex()
    if (count === 0) return 0
    return Math.min(count - 1, Math.max(0, raw))
  })

  /** Header and cells report their slide count; the largest wins (cells may lag a frame). */
  registerCount(count: number): void {
    if (count > this.count_()) this.count_.set(count)
    else if (count < this.count_() && count > 0) this.count_.set(count)
  }

  /** Next slide; wraps to the first after the last (plan 349, Critical Question → a). */
  next(): void {
    const count = this.slideCount()
    if (count === 0) return
    this.columnCarouselIndex.set((this.index() + 1) % count)
  }

  /** Previous slide; wraps to the last before the first. */
  prev(): void {
    const count = this.slideCount()
    if (count === 0) return
    this.columnCarouselIndex.set((this.index() - 1 + count) % count)
  }

  go(index: number): void {
    const count = this.slideCount()
    if (count === 0) return
    this.columnCarouselIndex.set(Math.min(count - 1, Math.max(0, index)))
  }
}
