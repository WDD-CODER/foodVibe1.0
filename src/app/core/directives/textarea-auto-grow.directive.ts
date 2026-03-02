import { Directive, ElementRef, HostListener, AfterViewInit } from '@angular/core';

/** Sets textarea height to fit content (auto-grow) on input and on init. */
@Directive({
  selector: 'textarea[textareaAutoGrow]',
  standalone: true
})
export class TextareaAutoGrowDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLTextAreaElement>) {}

  ngAfterViewInit(): void {
    this.resize();
  }

  @HostListener('input')
  @HostListener('change')
  onInput(): void {
    this.resize();
  }

  private resize(): void {
    const ta = this.el.nativeElement;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 40)}px`;
  }
}
