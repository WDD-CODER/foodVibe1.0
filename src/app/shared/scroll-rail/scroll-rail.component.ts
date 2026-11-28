import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PHONE_QUERY } from '@utils/breakpoints'

export type ScrollRailSnap = 'none' | 'proximity' | 'mandatory'
export type ScrollRailArrows = 'auto' | 'always' | 'never'
export type ScrollRailFrame = 'box' | 'none'

/** Within this many px of an end counts as "at the end" (sub-pixel scroll positions). */
const EDGE_EPSILON_PX = 2
/** A mouse or pen press that moves more than this many px sideways is a drag, not a click (plan 743). */
const DRAG_THRESHOLD_PX = 4

/**
 * Normalised scroll position: 0 at the inline start, growing toward the inline end, in both
 * LTR and RTL. Modern Chrome / Firefox / Safari report RTL `scrollLeft` as 0 at the start and
 * negative toward the end.
 */
export function normalizedScrollStart(scrollLeft: number, rtl: boolean): number {
  return rtl ? Math.abs(Math.min(0, scrollLeft)) : Math.max(0, scrollLeft)
}

/**
 * One reusable horizontal strip (plans 350, 743): projects its content into a snap-scroller with a
 * hidden scrollbar inside one visible container (`frame="box"`), shows RTL-correct prev/next arrows
 * only on the side(s) with more to see (`arrows="auto"`); where the arrow buttons are not rendered (a phone,
 * or `arrows="never"`) a solid round chevron inside the container is the sign of more (plans 747, 762). The row
 * can be grabbed and dragged with a mouse or pen. Content stays centered while it fits
 * (`justify-content: safe center`, overridable with `--rail-justify`).
 */
@Component({
  selector: 'app-scroll-rail',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './scroll-rail.component.html',
  styleUrl: './scroll-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'scroll-rail',
    '[class.is-overflowing]': 'overflowing()',
    '[class.is-dragging]': 'dragging_()'
  }
})
export class ScrollRailComponent {
  readonly snap = input<ScrollRailSnap>('proximity')
  readonly arrows = input<ScrollRailArrows>('auto')
  /** Pixels per arrow press, or 'page' (80% of the visible width). */
  readonly step = input<number | 'page'>('page')
  /** `box` draws the one shared container; `none` draws no surface. */
  readonly frame = input<ScrollRailFrame>('box')

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller')
  private readonly destroyRef = inject(DestroyRef)

  protected readonly canPrev_ = signal(false)
  protected readonly canNext_ = signal(false)
  private readonly isRtl_ = signal(false)
  /** Phone: the arrows are signs only (nothing to press or focus); the row is swiped. */
  protected readonly phone_ = signal(false)
  protected readonly dragging_ = signal(false)
  private drag_: { id: number; startX: number; startScroll: number; active: boolean } | null = null
  private swallowClick_ = false

  protected readonly showPrev = computed(
    () => this.arrows() === 'always' || (this.arrows() === 'auto' && this.canPrev_())
  )
  protected readonly showNext = computed(
    () => this.arrows() === 'always' || (this.arrows() === 'auto' && this.canNext_())
  )

  /** An arrow can be pressed or focused only while it is shown and the screen is not a phone. */
  protected readonly prevActive = computed(() => this.showPrev() && !this.phone_())
  protected readonly nextActive = computed(() => this.showNext() && !this.phone_())

  /** The arrow buttons exist only on a computer (a phone swipes; the sign inside the container says there is more) and unless `arrows="never"`. */
  protected readonly arrowsRendered = computed(() => this.arrows() !== 'never' && !this.phone_())

  /**
   * Plan 747 round two: the sign of more inside the container (a fade and a round chevron at the edge). Shown only
   * on the side that has more, and only when the outside arrow buttons are not there to say it.
   */
  protected readonly morePrev = computed(() => !this.arrowsRendered() && this.canPrev_())
  protected readonly moreNext = computed(() => !this.arrowsRendered() && this.canNext_())

  protected readonly overflowing = computed(() => this.canPrev_() || this.canNext_())

  constructor() {
    afterNextRender(() => {
      const el = this.scroller().nativeElement
      const update = (): void => this.update()
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
      ro?.observe(el)
      const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(update) : null
      mo?.observe(el, { childList: true, subtree: true, characterData: true })
      this.destroyRef.onDestroy(() => {
        ro?.disconnect()
        mo?.disconnect()
      })
      update()
      if (typeof matchMedia === 'function') {
        const mq = matchMedia(PHONE_QUERY)
        const onChange = (): void => this.phone_.set(mq.matches)
        onChange()
        mq.addEventListener?.('change', onChange)
        this.destroyRef.onDestroy(() => mq.removeEventListener?.('change', onChange))
      }
      // Capture phase: the click that ends a drag is swallowed before the chip or link under the pointer sees it.
      const onClick = (e: MouseEvent): void => {
        if (!this.swallowClick_) return
        this.swallowClick_ = false
        e.preventDefault()
        e.stopPropagation()
      }
      el.addEventListener('click', onClick, true)
      this.destroyRef.onDestroy(() => el.removeEventListener('click', onClick, true))
    })
  }

  /** Recomputes direction and which sides can still scroll. */
  update(): void {
    const el = this.scroller().nativeElement
    const rtl = getComputedStyle(el).direction === 'rtl'
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const pos = normalizedScrollStart(el.scrollLeft, rtl)
    this.isRtl_.set(rtl)
    this.canPrev_.set(pos > EDGE_EPSILON_PX)
    this.canNext_.set(pos < max - EDGE_EPSILON_PX)
  }

  private reducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  scrollByStep(direction: 'prev' | 'next'): void {
    const el = this.scroller().nativeElement
    const step = this.step()
    const amount = step === 'page' ? Math.max(40, el.clientWidth * 0.8) : step
    // Toward the inline end is +x in LTR and -x in RTL.
    const sign = (direction === 'next' ? 1 : -1) * (this.isRtl_() ? -1 : 1)
    el.scrollBy({ left: sign * amount, behavior: this.reducedMotion() ? 'auto' : 'smooth' })
  }

  /**
   * Plan 468: slides the rail so `el` (one of its children) sits in the middle, animated. The browser
   * does the maths, so it is right in LTR and RTL. Only the rail scrolls, never the page (`block: 'nearest'`
   * on a child that already fits vertically). Reduced motion, or `{ instant: true }`, jumps instead of gliding.
   */
  centerChild(el: HTMLElement, opts?: { instant?: boolean }): void {
    const jump = opts?.instant === true || this.reducedMotion()
    el.scrollIntoView({ behavior: jump ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }

  /** P1: on desktop a vertical wheel over an overflowing rail scrolls it sideways (unless Shift). */
  protected onWheel(event: WheelEvent): void {
    if (event.shiftKey || !(this.canPrev_() || this.canNext_())) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const el = this.scroller().nativeElement
    el.scrollLeft += this.isRtl_() ? -event.deltaY : event.deltaY
    event.preventDefault()
  }

  /** Plan 743: a mouse or pen press on the row starts tracking; touch is left to the browser. */
  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    if (event.button !== 0) return
    const el = this.scroller().nativeElement
    this.swallowClick_ = false
    this.drag_ = { id: event.pointerId, startX: event.clientX, startScroll: el.scrollLeft, active: false }
  }

  protected onPointerMove(event: PointerEvent): void {
    const d = this.drag_
    if (!d || d.id !== event.pointerId) return
    const el = this.scroller().nativeElement
    const dx = event.clientX - d.startX
    if (!d.active) {
      if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return
      d.active = true
      this.dragging_.set(true)
      // Now, not at the next render: a snapping scroller would pull the first moves back to a snap point.
      el.style.scrollSnapType = 'none'
      try {
        el.setPointerCapture(event.pointerId)
      } catch {
        // the pointer is already gone; the drag still follows the move events
      }
    }
    // The content follows the pointer, so scrollLeft moves the other way (the same sign in RTL).
    el.scrollLeft = d.startScroll - dx
  }

  protected onPointerEnd(event: PointerEvent): void {
    const d = this.drag_
    if (!d || d.id !== event.pointerId) return
    this.drag_ = null
    if (!d.active) return
    this.dragging_.set(false)
    this.scroller().nativeElement.style.removeProperty('scroll-snap-type')
    this.swallowClick_ = true
    // A drag that ends with no click (released elsewhere) must not swallow a later, real click.
    setTimeout(() => (this.swallowClick_ = false), 0)
    const el = this.scroller().nativeElement
    if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId)
  }
}
