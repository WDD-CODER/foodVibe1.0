import { Directive, ElementRef, inject } from '@angular/core'

@Directive({
  selector: '[SelectOnFocus]',
  host: { '(focus)': 'onFocus()' },
  standalone: true
})
export class SelectOnFocusDirective {
  private readonly el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef)

  onFocus() {
    this.el.nativeElement.select()
  }
}
