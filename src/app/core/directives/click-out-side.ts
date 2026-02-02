import { Directive, ElementRef, Output, EventEmitter, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  private elementRef = inject(ElementRef);

  @Output() clickOutside = new EventEmitter<void>();

  @HostListener('document:click', ['$event.target'])
  public onClick(target: HTMLElement): void {
    if (!target || !target.isConnected) return;

    // Check if the clicked element is the host or inside the host
    const isInside = this.elementRef.nativeElement.contains(target);

    if (!isInside) {
      this.clickOutside.emit();
    }
  }
}