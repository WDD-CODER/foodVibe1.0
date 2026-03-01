import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  inject
} from '@angular/core';

@Directive({
  selector: '[scrollIndicators]',
  standalone: true
})
export class ScrollIndicatorsDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    requestAnimationFrame(() => this.update());
  }

  @HostListener('scroll')
  onScroll(): void {
    this.update();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.update();
  }

  private update(): void {
    const host = this.el.nativeElement;
    const threshold = 1;
    const scrollTop = host.scrollTop;
    const clientHeight = host.clientHeight;
    const scrollHeight = host.scrollHeight;

    const canScrollUp = scrollTop > threshold;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - threshold;

    host.classList.toggle('can-scroll-up', canScrollUp);
    host.classList.toggle('can-scroll-down', canScrollDown);
  }
}
