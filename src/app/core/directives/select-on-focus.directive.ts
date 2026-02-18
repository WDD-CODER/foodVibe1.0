import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[SelectOnFocus]',
  standalone: true
})
export class SelectOnFocusDirective {
  constructor(private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>) {}

  @HostListener('focus')
  onFocus() {
    this.el.nativeElement.select();
  }
}