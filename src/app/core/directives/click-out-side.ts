import { Directive, ElementRef, Output, EventEmitter, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutSideDirective {
  private elementRef = inject(ElementRef);

  @Output() clickOutside = new EventEmitter<HTMLElement>();

  @HostListener('document:click', ['$event.target'])
  public onClick(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement) || !target.isConnected) return;

    const isInside = this.elementRef.nativeElement.contains(target);

    if (!isInside) {
      this.clickOutside.emit(target);
    }
  }
}