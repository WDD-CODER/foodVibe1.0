import { Directive, ElementRef, inject } from '@angular/core'

@Directive({
  selector: '[appSelectOnFocus]',
  host: { '(focus)': 'onFocus()' },
  standalone: true
})
export class SelectOnFocusDirective {
  private readonly el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef)

  onFocus() {
    this.el.nativeElement.select()
  }
}
