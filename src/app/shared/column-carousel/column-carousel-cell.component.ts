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
import { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
import { ColumnSlideDirective } from './column-slide.directive'
import { FallColumnDirective } from './fall-column.directive'
import { buildFallParts } from './fall-parts'
import { SwipeStart, isCarouselActive, isRtl, swipeDirection } from './column-carousel-swipe'

/**
 * Row cell of the column carousel (plan 349). Slide mode: the projected `[columnSlide]` cells render as normal
 * grid cells on desktop; ≤768px one cell showing the active value (the header names it).
 * Measured mode (plan 745, the children are `*appFallColumn`): each column that fits is its own cell and one
 * switching cell, at the place of the first fallen column, shows the active fallen column at any width.
 * A swipe here or the header arrows move the whole list (shared group index).
 */
@Component({
  selector: 'app-column-carousel-cell',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './column-carousel-cell.component.html',
  styleUrl: './column-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'column-carousel column-carousel--cell',
    '[class.c-list-body-cell]': '!measured()',
    '[class.column-carousel--measured]': 'measured()',
    role: 'cell',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'onPointerUp($event)'
  }
})
export class ColumnCarouselCellComponent {
  protected readonly group = inject(ColumnCarouselGroupDirective)
  private readonly el = inject(ElementRef<HTMLElement>)
  private readonly slides = contentChildren(ColumnSlideDirective)
  private readonly falls = contentChildren(FallColumnDirective)
  private swipeStart: SwipeStart | null = null

  protected readonly measured = computed(() => this.falls().length > 0 && this.group.collapsed() !== null)
  protected readonly parts = computed(() =>
    buildFallParts(this.falls(), this.group.collapsed() ?? [], this.group.index())
  )

  constructor() {
    effect(() => {
      const slides = this.slides()
      this.group.registerCount(slides.length)
      const index = this.group.index()
      slides.forEach((s, i) => s.isActive.set(i === index))
    })
  }

  protected onPointerDown(event: PointerEvent): void {
    const inBox = !this.measured() || (event.target instanceof Element && !!event.target.closest('.cc-box'))
    this.swipeStart = inBox ? { x: event.clientX, y: event.clientY } : null
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.swipeStart || !isCarouselActive(this.group)) return
    const dir = swipeDirection(this.swipeStart, event.clientX, event.clientY, isRtl(this.el.nativeElement))
    this.swipeStart = null
    if (!dir) return
    // A swipe is not a tap: keep it from also opening the row.
    event.stopPropagation()
    if (dir === 'next') this.group.next()
    else this.group.prev()
  }
}
