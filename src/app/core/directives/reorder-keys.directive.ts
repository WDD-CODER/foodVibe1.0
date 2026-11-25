import { Directive, ElementRef, inject, input, output } from '@angular/core'

/**
 * Moves a row of a drag list with the keyboard (plan 742). Put it on the drag handle beside `cdkDragHandle`:
 * the handle becomes a focusable button, ArrowUp / ArrowDown emit `reorder` (-1 / 1), and focus returns to the
 * same row's handle once the row has been re-rendered in its new place (the handle itself when the row was moved,
 * else the handle carrying the row's `reorderKey` inside the nearest `.c-drag-list`). The parent calls the same
 * move method its drop handler uses.
 */
@Directive({
  selector: '[appReorderKeys]',
  standalone: true,
  host: {
    tabindex: '0',
    role: 'button',
    '[attr.data-reorder-key]': 'reorderKey()',
    '(keydown.arrowUp)': 'onKey($event, -1)',
    '(keydown.arrowDown)': 'onKey($event, 1)'
  }
})
export class ReorderKeysDirective {
  private readonly el_ = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly reorderIndex = input.required<number>()
  readonly reorderCount = input.required<number>()
  /** The row's track value: how the handle is found again after the row has moved. */
  readonly reorderKey = input.required<string | number>()
  readonly reorder = output<-1 | 1>()

  protected onKey(event: Event, step: -1 | 1): void {
    event.preventDefault()
    const target = this.reorderIndex() + step
    if (target < 0 || target >= this.reorderCount()) return
    const host = this.el_.nativeElement
    const list = host.closest('.c-drag-list')
    const key = String(this.reorderKey())
    this.reorder.emit(step)
    requestAnimationFrame(() => {
      // A row tracked by identity is moved, not re-created: its own handle is still in the page.
      if (host.isConnected) {
        host.focus()
        return
      }
      const handles = list?.querySelectorAll<HTMLElement>('[data-reorder-key]') ?? []
      Array.from(handles)
        .find((h) => h.dataset['reorderKey'] === key)
        ?.focus()
    })
  }
}
