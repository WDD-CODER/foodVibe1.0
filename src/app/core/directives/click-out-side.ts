import { Directive, ElementRef, output, inject } from '@angular/core'

@Directive({
  selector: '[appClickOutside]',
  host: { '(document:click)': 'onClick($event.target)' },
  standalone: true
})
export class ClickOutSideDirective {
  private elementRef = inject(ElementRef)

  clickOutside = output<HTMLElement>({ alias: 'appClickOutside' })

  public onClick(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement) || !target.isConnected) return

    const isInside = this.elementRef.nativeElement.contains(target)

    if (!isInside) {
      this.clickOutside.emit(target)
    }
  }
}
