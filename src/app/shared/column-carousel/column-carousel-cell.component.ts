import { ChangeDetectionStrategy, Component, ElementRef, computed, contentChildren, effect, inject } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
import { ColumnSlideDirective } from './column-slide.directive'
import { SwipeStart, isCarouselActive, isRtl, swipeDirection } from './column-carousel-swipe'

/**
 * Row cell of the mobile column carousel (plan 349). Desktop: the projected `[columnSlide]`
 * cells render as normal grid cells. ≤768px: one cell (row-colored, it carries the
 * `.c-list-body-cell` look) with a small "‹ label ›" line above the active value; swipe or the
 * arrows move the whole list (shared group index).
 */
@Component({
  selector: 'app-column-carousel-cell',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './column-carousel-cell.component.html',
  styleUrl: './column-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'column-carousel column-carousel--cell c-list-body-cell',
    role: 'cell',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'onPointerUp($event)'
  }
})
export class ColumnCarouselCellComponent {
  protected readonly group = inject(ColumnCarouselGroupDirective)
  private readonly el = inject(ElementRef<HTMLElement>)
  private readonly slides = contentChildren(ColumnSlideDirective)
  private swipeStart: SwipeStart | null = null

  protected readonly activeLabel = computed(() => this.slides()[this.group.index()]?.label() ?? '')

  constructor() {
    effect(() => {
      const slides = this.slides()
      this.group.registerCount(slides.length)
      const index = this.group.index()
      slides.forEach((s, i) => s.active.set(i === index))
    })
  }

  protected next(event: Event): void {
    event.stopPropagation()
    this.group.next()
  }

  protected prev(event: Event): void {
    event.stopPropagation()
    this.group.prev()
  }

  protected onPointerDown(event: PointerEvent): void {
    this.swipeStart = { x: event.clientX, y: event.clientY }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.swipeStart || !isCarouselActive()) return
    const dir = swipeDirection(this.swipeStart, event.clientX, event.clientY, isRtl(this.el.nativeElement))
    this.swipeStart = null
    if (!dir) return
    // A swipe is not a tap: keep it from also opening the row.
    event.stopPropagation()
    if (dir === 'next') this.group.next()
    else this.group.prev()
  }
}
