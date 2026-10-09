import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core'
import { ListSelectionState } from './list-selection.state'

/** Hold time before a press on a row marks it. */
const LONG_PRESS_MS = 500
/** Finger travel (px) that cancels a long press, so scrolling never marks a row. */
const LONG_PRESS_MOVE_TOLERANCE = 10
/** Phones and tablets without a mouse — the same query the list SCSS uses to hide checkboxes. */
const TOUCH_QUERY = '(hover: none)'
/** Presses on these keep their own behaviour (buttons, links, the checkbox itself). */
const INTERACTIVE_TARGETS = 'button, a, app-list-row-checkbox'

/**
 * Touch lists mark rows by long press instead of checkboxes: holding a row toggles it in the
 * list's selection state, and the click that ends the hold is swallowed so it doesn't also
 * open the row. Mouse devices are untouched (they keep the checkbox column).
 */
@Directive({
  selector: '[listRowSelect]',
  standalone: true,
  host: {
    '[class.is-selected]': 'selection().isSelected(rowId())',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'cancel()',
    '(pointercancel)': 'cancel()',
    '(pointerleave)': 'cancel()',
    '(contextmenu)': 'onContextMenu($event)'
  }
})
export class ListRowSelectDirective implements OnDestroy {
  readonly selection = input.required<ListSelectionState>({ alias: 'listRowSelect' })
  readonly rowId = input.required<string>({ alias: 'listRowSelectId' })

  private readonly isTouch_ = typeof matchMedia === 'function' && matchMedia(TOUCH_QUERY).matches
  private timer_: ReturnType<typeof setTimeout> | null = null
  private start_: { x: number; y: number } | null = null
  private suppressNextClick_ = false

  constructor() {
    // Capture phase: runs before the row's own (click) handler so a finished hold never opens the row.
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.addEventListener(
      'click',
      (event) => {
        if (!this.suppressNextClick_) return
        this.suppressNextClick_ = false
        event.stopPropagation()
        event.preventDefault()
      },
      true
    )
  }

  ngOnDestroy(): void {
    this.cancel()
  }

  protected onPointerDown(event: PointerEvent): void {
    // A hold on touch often ends without a click, so a stale flag is reset by the next press.
    this.suppressNextClick_ = false
    if (!this.isTouch_ || event.button !== 0) return
    if ((event.target as HTMLElement).closest(INTERACTIVE_TARGETS)) return
    this.cancel()
    this.start_ = { x: event.clientX, y: event.clientY }
    this.timer_ = setTimeout(() => {
      this.timer_ = null
      this.start_ = null
      this.suppressNextClick_ = true
      this.selection().toggle(this.rowId())
      navigator.vibrate?.(30)
    }, LONG_PRESS_MS)
  }

  protected onPointerMove(event: PointerEvent): void {
    const start = this.start_
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE) this.cancel()
  }

  protected cancel(): void {
    if (this.timer_) clearTimeout(this.timer_)
    this.timer_ = null
    this.start_ = null
  }

  /** Stop the phone's long-press context menu from opening over the marked row. */
  protected onContextMenu(event: Event): void {
    if (this.isTouch_) event.preventDefault()
  }
}
