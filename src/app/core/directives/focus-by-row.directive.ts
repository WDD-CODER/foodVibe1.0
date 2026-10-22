import { Directive, ElementRef, inject, input } from '@angular/core'

/**
 * Place on quantity input or unit select in ingredient row.
 * Table can focus by row index and type via ViewChildren.
 */
@Directive({
  selector: '[appFocusByRow]',
  standalone: true
})
export class FocusByRowDirective {
  readonly rowIndex = input.required<number>()
  readonly kind = input<'qty' | 'unit'>('qty')

  private readonly el = inject<ElementRef<HTMLInputElement | HTMLSelectElement>>(ElementRef)

  focus(): void {
    this.el.nativeElement.focus()
  }
}
