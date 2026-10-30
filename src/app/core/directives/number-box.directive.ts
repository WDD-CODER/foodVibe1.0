import { Directive, ElementRef, inject } from '@angular/core'

/** Parts of a number box that keep their own tap meaning (stepper +/-, clear X, links, other fields). */
const INTERACTIVE = 'button, a, select, textarea, input, [role="button"], .c-chip, [data-number-box-ignore]'

/**
 * Plan 499 — put on the container of a box whose only content is an editable number. A tap anywhere on it
 * (label, suffix, padding) focuses the inner `input[type=number]`; `SelectOnFocusDirective` then selects the
 * whole value. Buttons and other fields inside the box keep their own behaviour; a disabled or read-only number,
 * or one that already has focus, is left alone.
 */
@Directive({
  selector: '[appNumberBox]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(mousedown)': 'onMouseDown($event)'
  },
  standalone: true
})
export class NumberBoxDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef)

  onPointerDown(event: Event): void {
    const input = this.targetInput_(event)
    if (input) input.focus({ preventScroll: true })
  }

  /** Keeps the browser from moving focus off the number after the pointerdown focus. */
  onMouseDown(event: Event): void {
    if (this.targetInput_(event, true)) event.preventDefault()
  }

  private targetInput_(event: Event, allowFocused = false): HTMLInputElement | null {
    const target = event.target
    if (!(target instanceof Element)) return null
    const host = this.el.nativeElement
    const hit = target.closest(INTERACTIVE)
    if (hit && hit !== host && host.contains(hit)) return null
    const input = host.querySelector<HTMLInputElement>('input[type="number"]')
    if (!input || input.disabled || input.readOnly) return null
    if (!allowFocused && document.activeElement === input) return null
    return input
  }
}
