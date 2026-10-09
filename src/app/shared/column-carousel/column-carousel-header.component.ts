import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  contentChildren,
  effect,
  inject
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
import { ColumnSlideDirective } from './column-slide.directive'
import { SwipeStart, isCarouselActive, isRtl, swipeDirection } from './column-carousel-swipe'

/**
 * Header cell of the mobile column carousel (plan 349). Desktop: the projected `[columnSlide]`
 * header cells render as normal grid cells. ≤768px: one cell carrying the active column's name as its aria-label,
 * position dots and two floating round arrows; swipe and ←/→ keys move every row with it.
 */
@Component({
  selector: 'app-column-carousel-header',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './column-carousel-header.component.html',
  styleUrl: './column-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'column-carousel column-carousel--header c-grid-header-cell',
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
  private swipeStart: SwipeStart | null = null

  protected readonly activeLabel = computed(() => this.slides()[this.group.index()]?.label() ?? '')
  protected readonly dots = computed(() => this.slides().map((_, i) => i))

  constructor() {
    effect(() => {
      const slides = this.slides()
      this.group.registerCount(slides.length)
      const index = this.group.index()
      slides.forEach((s, i) => s.active.set(i === index))
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
    this.swipeStart = { x: event.clientX, y: event.clientY }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.swipeStart || !isCarouselActive()) return
    const dir = swipeDirection(this.swipeStart, event.clientX, event.clientY, isRtl(this.el.nativeElement))
    this.swipeStart = null
    if (dir === 'next') this.group.next()
    else if (dir === 'prev') this.group.prev()
  }

  /** P1: ←/→ on the focused header move slides (RTL-aware: ← is "next" in RTL). */
  protected onArrowKey(event: Event, key: 'left' | 'right'): void {
    if (!isCarouselActive()) return
    event.preventDefault()
    const rtl = isRtl(this.el.nativeElement)
    const goNext = rtl ? key === 'left' : key === 'right'
    if (goNext) this.group.next()
    else this.group.prev()
  }
}
