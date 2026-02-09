import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[SelectOnFocus]',
  standalone: true
})
export class SelectOnFocusDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('focus')
  onFocus() {
    // Selects the whole number so the next keystroke replaces it
    this.el.nativeElement.select();
  }
}