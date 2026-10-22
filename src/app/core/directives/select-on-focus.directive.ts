import { Directive, ElementRef, inject } from '@angular/core'

/** Input types that accept `setSelectionRange` (number and email inputs throw on it). */
const RANGE_TYPES = new Set(['text', 'search', 'url', 'tel', 'password'])

/**
 * Selects the whole value when the box gets focus, so what the user types replaces it.
 * Browsers put the caret at the pointer on the `mouseup` right after a tap/click focus, which drops the
 * selection; the first `mouseup` after a focus is therefore default-prevented once.
 */
@Directive({
  selector: '[appSelectOnFocus]',
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
    event.preventDefault()
  }

  onBlur(): void {
    this.isFreshFocus_ = false
  }
}
