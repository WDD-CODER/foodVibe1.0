import { AfterViewChecked, Directive, ElementRef, inject } from '@angular/core'

const MIN_HEIGHT_PX = 40

/**
 * Sets a textarea's height to fit its content: on input, focus, window resize, and after any view check where
 * the value or width changed (so a programmatic `[value]` / `ngModel` write grows or shrinks it too). The box
 * never scrolls inside itself (`overflow-y: hidden`).
 */
@Directive({
  selector: 'textarea[appTextareaAutoGrow]',
  host: {
    '(input)': 'resize()',
    '(change)': 'resize()',
    '(focus)': 'resize()',
    '(window:resize)': 'resize()',
    style: 'overflow-y: hidden'
  },
  standalone: true
})
export class TextareaAutoGrowDirective implements AfterViewChecked {
  private readonly el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef)
  private lastValue_: string | null = null
  private lastWidth_ = 0

  ngAfterViewChecked(): void {
    const ta = this.el.nativeElement
    if (ta.value === this.lastValue_ && ta.clientWidth === this.lastWidth_) return
    this.resize()
  }

  resize(): void {
    const ta = this.el.nativeElement
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(ta.scrollHeight, MIN_HEIGHT_PX)}px`
    this.lastValue_ = ta.value
    this.lastWidth_ = ta.clientWidth
  }
}
