import { Directive, ElementRef, Output, EventEmitter, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutSideDirective {
  private elementRef = inject(ElementRef);

  @Output() clickOutside = new EventEmitter<void>();

@HostListener('document:click', ['$event.target'])
public onClick(target: EventTarget | null): void { // Changed from HTMLElement
  // Logic: Guard against null or non-element targets
  if (!(target instanceof HTMLElement) || !target.isConnected) return;

  // Now TypeScript knows 'target' is safely an HTMLElement
  const isInside = this.elementRef.nativeElement.contains(target);

  if (!isInside) {
    this.clickOutside.emit();
  }
}

}