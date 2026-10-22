import { Directive, ElementRef, AfterViewInit, inject } from '@angular/core'

/** Sets textarea height to fit content (auto-grow) on input and on init. */
@Directive({
  selector: 'textarea[textareaAutoGrow]',
  host: { '(input)': 'onInput()', '(change)': 'onInput()' },
  standalone: true
})
export class TextareaAutoGrowDirective implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef)

  ngAfterViewInit(): void {
    this.resize()
  }

  onInput(): void {
    this.resize()
  }

  private resize(): void {
    const ta = this.el.nativeElement
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(ta.scrollHeight, 40)}px`
  }
}
