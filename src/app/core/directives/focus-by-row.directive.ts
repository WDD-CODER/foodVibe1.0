import { Directive, ElementRef, input } from '@angular/core';

/**
 * Place on quantity input or unit select in ingredient row.
 * Table can focus by row index and type via ViewChildren.
 */
@Directive({
  selector: '[focusByRow]',
  standalone: true
})
export class FocusByRowDirective {
  readonly rowIndex = input.required<number>();
  readonly kind = input<'qty' | 'unit'>('qty');

  constructor(private el: ElementRef<HTMLInputElement | HTMLSelectElement>) {}

  focus(): void {
    this.el.nativeElement.focus();
  }
}
