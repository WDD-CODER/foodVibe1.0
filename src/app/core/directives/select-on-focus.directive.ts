import { Directive, ElementRef, inject } from '@angular/core'

/** Input types that accept `setSelectionRange` (number and email inputs throw on it). */
const RANGE_TYPES = new Set(['text', 'search', 'url', 'tel', 'password'])

/**
 * Selects the whole value when the box gets focus, so what the user types replaces it.
 * Browsers put the caret at the pointer on the `mouseup` right after a tap/click focus, which drops the
 * selection; the first `mouseup` after a focus is therefore default-prevented once.
 * Plan 482: on a desktop mouse click Chromium also moves the caret during the `mousedown` default action, after
 * `focus` already selected, so that first `mouseup` selects the whole value again. Every number box gets this
 * through the `input[type=number]` selector (its component still has to import the directive).
 */
@Directive({
  selector: '[appSelectOnFocus], input[type=number]',
  host: {
    '(focus)': 'onFocus()',
    '(mousedown)': 'onMouseDown()',
    '(mouseup)': 'onMouseUp($event)',
    '(blur)': 'onBlur()'
  },
  standalone: true
})
export class SelectOnFocusDirective {
  private readonly el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef)
  private isFreshFocus_ = false

  onFocus(): void {
    const box = this.el.nativeElement
    box.select()
    try {
      if (box instanceof HTMLTextAreaElement || RANGE_TYPES.has(box.type)) box.setSelectionRange(0, box.value.length)
    } catch {
      // Some input types refuse a selection range; select() above already did the job.
    }
    this.isFreshFocus_ = true
  }

  /** A press on a box that already has focus is a normal caret placement. */
  onMouseDown(): void {
    if (document.activeElement === this.el.nativeElement) this.isFreshFocus_ = false
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.isFreshFocus_) return
    this.isFreshFocus_ = false
    // A multi-line text box keeps the normal caret placement: a click into existing text must not select it all.
    const box = this.el.nativeElement
    if (box instanceof HTMLTextAreaElement) return
    event.preventDefault()
    box.select()
  }

  onBlur(): void {
    this.isFreshFocus_ = false
  }
}
