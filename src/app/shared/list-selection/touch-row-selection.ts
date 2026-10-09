import { DestroyRef, effect, inject } from '@angular/core'
import { ListSelectionState } from './list-selection.state'

/** Hold time before a press on a row enters selection mode. */
const LONG_PRESS_MS = 500
/** Finger travel (px) that cancels a long press, so scrolling never selects. */
const LONG_PRESS_MOVE_TOLERANCE = 10
/** Phones and tablets without a mouse: these select by long press and show no checkboxes. */
const TOUCH_QUERY = '(hover: none)'
/** A press on any of these is theirs, never a row long press. */
const INTERACTIVE_TARGETS = 'button, a, input, app-list-row-checkbox, app-row-actions-menu'

export function isTouchDevice(): boolean {
  return typeof matchMedia === 'function' && matchMedia(TOUCH_QUERY).matches
}

/** Default keep-selection targets for the table lists. */
export const LIST_KEEP_TARGETS = '.c-list-row, app-selection-bar, app-confirm-modal, .c-modal-overlay'

export interface TouchRowSelectionOptions {
  selection: ListSelectionState
  /** history.state marker for the entry pushed while selecting, so Back leaves selection mode. */
  historyKey: string
  /** Taps on these keep the selection: rows toggle, the bar and its dialogs act on it. */
  keepTargets?: string
}

/**
 * Touch selection for a list (venues, recipe book, inventory, suppliers, equipment): a long press
 * on a row enters selection mode with that row selected, then every tap toggles a row. A tap
 * outside the rows and the selection bar, or Back, ends it. Mouse devices are untouched.
 * Create it in a field initializer: it needs the injection context.
 */
export class TouchRowSelection {
  readonly isTouch = isTouchDevice()

  private readonly selection: ListSelectionState
  private readonly historyKey: string
  private readonly keepTargets: string
  private longPressTimer_: ReturnType<typeof setTimeout> | null = null
  private longPressStart_: { x: number; y: number } | null = null
  /** The click that follows a completed long press must not also navigate or toggle. */
  private suppressNextClick_ = false
  /** True while our selection-mode history entry is on top of the stack. */
  private historyPushed_ = false

  private readonly onPopState_ = (): void => {
    if (!this.historyPushed_) return
    this.historyPushed_ = false
    this.selection.clear()
  }

  private readonly onDocumentClick_ = (event: MouseEvent): void => {
    if (!this.selection.selectionMode()) return
    const el = event.target as HTMLElement | null
    if (!el?.isConnected || el.closest(this.keepTargets)) return
    this.selection.clear()
  }

  constructor(options: TouchRowSelectionOptions) {
    this.selection = options.selection
    this.historyKey = options.historyKey
    this.keepTargets = options.keepTargets ?? LIST_KEEP_TARGETS
    if (!this.isTouch) return

    window.addEventListener('popstate', this.onPopState_)
    document.addEventListener('click', this.onDocumentClick_)

    // Selection mode owns one history entry: entering pushes it (so Back clears the selection),
    // clearing any other way (selection bar, last row unchecked) pops it.
    effect(() => {
      const selecting = this.selection.selectionMode()
      if (selecting && !this.historyPushed_) {
        history.pushState({ ...history.state, [this.historyKey]: true }, '')
        this.historyPushed_ = true
      } else if (!selecting && this.historyPushed_) {
        this.historyPushed_ = false
        history.back()
      }
    })

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('popstate', this.onPopState_)
      document.removeEventListener('click', this.onDocumentClick_)
      this.cancel()
      // Leaving the page while selecting: the pushed entry stays as a harmless same-URL step.
      this.historyPushed_ = false
    })
  }

  /** Bind to the row's `(pointerdown)`. */
  onPointerDown(id: string, event: PointerEvent): void {
    // A long press on touch often ends without a click, so a stale flag is reset by the next press.
    this.suppressNextClick_ = false
    if (!this.isTouch || event.button !== 0) return
    if ((event.target as HTMLElement).closest(INTERACTIVE_TARGETS)) return
    this.cancel()
    this.longPressStart_ = { x: event.clientX, y: event.clientY }
    this.longPressTimer_ = setTimeout(() => {
      this.longPressTimer_ = null
      this.longPressStart_ = null
      this.suppressNextClick_ = true
      this.selection.toggle(id)
      navigator.vibrate?.(30)
    }, LONG_PRESS_MS)
  }

  /** Bind to `(pointermove)`. */
  onPointerMove(event: PointerEvent): void {
    const start = this.longPressStart_
    if (!start) return
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (moved > LONG_PRESS_MOVE_TOLERANCE) this.cancel()
  }

  /** Bind to `(pointerup)`, `(pointercancel)` and `(pointerleave)`. */
  cancel(): void {
    if (this.longPressTimer_) clearTimeout(this.longPressTimer_)
    this.longPressTimer_ = null
    this.longPressStart_ = null
  }

  /** Bind to `(contextmenu)`: stops the phone's long-press menu opening over the selection. */
  onContextMenu(event: Event): void {
    if (this.suppressNextClick_ || this.selection.selectionMode()) event.preventDefault()
  }

  /** Call first in the row click handler; true means the click ended a long press and is spent. */
  consumeClick(): boolean {
    if (!this.suppressNextClick_) return false
    this.suppressNextClick_ = false
    return true
  }
}
