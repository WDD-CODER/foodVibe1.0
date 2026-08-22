import { Injectable, signal } from '@angular/core'

/**
 * Minimum time an operation must stay pending before the global loading overlay shows.
 * Keeps near-instant loads (already-cached data, fast local-storage reads) from flashing
 * the overlay — the overlay is only worth showing when a wait is actually perceptible.
 */
const SHOW_DEBOUNCE_MS = 200

/**
 * Tracks in-flight "the user is waiting on something with no other feedback" operations
 * (currently: initial data hydration in BaseEntityDataService/ProductDataService/
 * RecipeDataService/DishDataService — see `loadInitialData()` in each) and exposes a single
 * debounced signal the app root uses to show the pot-with-steam overlay.
 *
 * Deliberately NOT wired into every CRUD call — the ~30 existing per-action inline spinners
 * (save/delete/AI-generate buttons) already give correct, localized feedback for those and
 * would double up with a full-screen overlay if this tracked them too.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendingCount_ = signal(0)
  private readonly visible_ = signal(false)
  private showTimer_: ReturnType<typeof setTimeout> | null = null

  /** True once at least one tracked operation has stayed pending past the debounce window. */
  readonly isLoading_ = this.visible_.asReadonly()

  /** Wrap an async operation whose pendency should count toward the global loading overlay. */
  async track<T>(work: Promise<T>): Promise<T> {
    this.begin()
    try {
      return await work
    } finally {
      this.end()
    }
  }

  private begin(): void {
    const next = this.pendingCount_() + 1
    this.pendingCount_.set(next)
    if (next === 1 && this.showTimer_ === null) {
      this.showTimer_ = setTimeout(() => {
        this.showTimer_ = null
        if (this.pendingCount_() > 0) this.visible_.set(true)
      }, SHOW_DEBOUNCE_MS)
    }
  }

  private end(): void {
    const next = Math.max(0, this.pendingCount_() - 1)
    this.pendingCount_.set(next)
    if (next === 0) {
      if (this.showTimer_ !== null) {
        clearTimeout(this.showTimer_)
        this.showTimer_ = null
      }
      this.visible_.set(false)
    }
  }
}
