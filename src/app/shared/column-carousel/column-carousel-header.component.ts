import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  contentChildren,
  effect,
  inject
} from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
import { ColumnSlideDirective } from './column-slide.directive'
import { FallColumnDirective } from './fall-column.directive'
import { buildFallParts } from './fall-parts'
import { SwipeStart, isCarouselActive, isRtl, swipeDirection } from './column-carousel-swipe'

/**
 * Header cell of the column carousel (plan 349). Slide mode: the projected `[columnSlide]` header cells render as
 * normal grid cells on desktop; ≤768px one cell carrying the active column's name as its aria-label, position
 * dots and two floating round arrows. Measured mode (plan 745, the children are `*appFallColumn`): each column
 * that fits is its own header cell and the switching header sits where the first fallen column was, at any
 * width. Swipe and ←/→ keys move every row with it.
 */
@Component({
  selector: 'app-column-carousel-header',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, NgTemplateOutlet],
  templateUrl: './column-carousel-header.component.html',
  styleUrl: './column-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'column-carousel column-carousel--header',
    '[class.c-grid-header-cell]': '!measured()',
    '[class.column-carousel--measured]': 'measured()',
    role: 'columnheader',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(keydown.arrowleft)': 'onArrowKey($event, "left")',
    '(keydown.arrowright)': 'onArrowKey($event, "right")'
  }
})
export class ColumnCarouselHeaderComponent {
  protected readonly group = inject(ColumnCarouselGroupDirective)
  private readonly el = inject(ElementRef<HTMLElement>)
  private readonly slides = contentChildren(ColumnSlideDirective)
  private readonly falls = contentChildren(FallColumnDirective)
  private swipeStart: SwipeStart | null = null

  protected readonly measured = computed(() => this.falls().length > 0 && this.group.collapsed() !== null)
  protected readonly parts = computed(() =>
    buildFallParts(this.falls(), this.group.collapsed() ?? [], this.group.index())
  )

  protected readonly activeLabel = computed(() => {
    if (this.measured()) {
      const id = this.group.collapsed()?.[this.group.index()]
      return (
        this.falls()
          .find((f) => f.id() === id)
          ?.label() ?? ''
      )
    }
    return this.slides()[this.group.index()]?.label() ?? ''
  })
  protected readonly dots = computed(() =>
    this.measured() ? (this.group.collapsed() ?? []).map((_, i) => i) : this.slides().map((_, i) => i)
  )

  constructor() {
    effect(() => {
      const slides = this.slides()
      this.group.registerCount(slides.length)
      const index = this.group.index()
      slides.forEach((s, i) => s.isActive.set(i === index))
    })
  }

  protected next(event?: Event): void {
    event?.stopPropagation()
    this.group.next()
  }

  protected prev(event?: Event): void {
    event?.stopPropagation()
    this.group.prev()
  }

  protected onPointerDown(event: PointerEvent): void {
    const inBox = !this.measured() || (event.target instanceof Element && !!event.target.closest('.cc-box'))
    this.swipeStart = inBox ? { x: event.clientX, y: event.clientY } : null
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.swipeStart || !isCarouselActive(this.group)) return
    const dir = swipeDirection(this.swipeStart, event.clientX, event.clientY, isRtl(this.el.nativeElement))
    this.swipeStart = null
    if (dir === 'next') this.group.next()
    else if (dir === 'prev') this.group.prev()
  }

  /** P1: ←/→ on the focused header move slides (RTL-aware: ← is "next" in RTL). */
  protected onArrowKey(event: Event, key: 'left' | 'right'): void {
    if (!isCarouselActive(this.group)) return
    // Own header cells (not the switching one) keep their arrow keys.
    if (this.measured() && !(event.target instanceof Element && event.target.closest('.cc-box'))) return
    event.preventDefault()
    const rtl = isRtl(this.el.nativeElement)
    const goNext = rtl ? key === 'left' : key === 'right'
    if (goNext) this.group.next()
    else this.group.prev()
  }
}
