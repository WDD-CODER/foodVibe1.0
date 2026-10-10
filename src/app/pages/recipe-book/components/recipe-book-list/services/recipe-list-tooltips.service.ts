import { DOCUMENT } from '@angular/common'
import { DestroyRef, Injectable, inject, signal } from '@angular/core'

/** How long after a closing touch the same tap's emulated mouseenter/click are ignored. */
const TOUCH_CLOSE_GUARD_MS = 500

/**
 * Cost and date tooltip state for the recipe book list (plan 399) — hover on PC, tap on phone.
 * Component-scoped: provided in RecipeBookListComponent's `providers`.
 * Touch: the next touch anywhere closes an open tooltip (a tap never sends mouseleave).
 */
@Injectable()
export class RecipeListTooltipsService {
  private readonly document = inject(DOCUMENT)

  private readonly costHoveredId_ = signal<string | null>(null)
  private readonly costTappedId_ = signal<string | null>(null)
  private readonly costAnchor_ = signal<DOMRect | null>(null)
  private readonly dateHoveredId_ = signal<string | null>(null)
  private readonly dateAnchor_ = signal<DOMRect | null>(null)
  private suppressUntil_ = 0

  readonly costHoveredId = this.costHoveredId_.asReadonly()
  readonly costTappedId = this.costTappedId_.asReadonly()
  readonly costAnchor = this.costAnchor_.asReadonly()
  readonly dateHoveredId = this.dateHoveredId_.asReadonly()
  readonly dateAnchor = this.dateAnchor_.asReadonly()

  constructor() {
    const onPointerDown = (event: PointerEvent) => this.closeOnTouch(event)
    this.document.addEventListener('pointerdown', onPointerDown, true)
    inject(DestroyRef).onDestroy(() => this.document.removeEventListener('pointerdown', onPointerDown, true))
  }

  showCost(recipeId: string, event?: Event): void {
    if (this.isSuppressed()) return
    const el = event?.currentTarget as HTMLElement | undefined
    if (el) this.costAnchor_.set(el.getBoundingClientRect())
    this.costHoveredId_.set(recipeId)
  }

  hideCost(): void {
    this.costHoveredId_.set(null)
    if (!this.costTappedId_()) this.costAnchor_.set(null)
  }

  toggleCostTap(recipeId: string, event?: Event): void {
    if (this.isSuppressed()) return
    const wasOpen = this.costTappedId_() === recipeId
    this.costTappedId_.update((id) => (id === recipeId ? null : recipeId))
    if (!wasOpen && recipeId) {
      const el = event?.currentTarget as HTMLElement | undefined
      if (el) this.costAnchor_.set(el.getBoundingClientRect())
    } else if (!this.costTappedId_() && !this.costHoveredId_()) {
      this.costAnchor_.set(null)
    }
  }

  closeCostTap(): void {
    this.costTappedId_.set(null)
    if (!this.costHoveredId_()) this.costAnchor_.set(null)
  }

  showDate(recipeId: string, event?: Event): void {
    if (this.isSuppressed()) return
    const el = event?.currentTarget as HTMLElement | undefined
    if (el) this.dateAnchor_.set(el.getBoundingClientRect())
    this.dateHoveredId_.set(recipeId)
  }

  hideDate(): void {
    this.dateHoveredId_.set(null)
    this.dateAnchor_.set(null)
  }

  /** Any non-mouse pointerdown closes every open tooltip; that tap can't reopen one. */
  private closeOnTouch(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return
    const isOpen = this.costHoveredId_() || this.costTappedId_() || this.dateHoveredId_()
    if (!isOpen) return
    this.costHoveredId_.set(null)
    this.costTappedId_.set(null)
    this.costAnchor_.set(null)
    this.hideDate()
    this.suppressUntil_ = performance.now() + TOUCH_CLOSE_GUARD_MS
  }

  private isSuppressed(): boolean {
    return performance.now() < this.suppressUntil_
  }
}
