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

export type ScrollRailSnap = 'none' | 'proximity' | 'mandatory'
export type ScrollRailArrows = 'auto' | 'always' | 'never'

/** Within this many px of an end counts as "at the end" (sub-pixel scroll positions). */
const EDGE_EPSILON_PX = 2
/** Width of the edge fade on a side that can scroll. */
const FADE_PX = 24

/**
 * Normalised scroll position: 0 at the inline start, growing toward the inline end, in both
 * LTR and RTL. Modern Chrome / Firefox / Safari report RTL `scrollLeft` as 0 at the start and
 * negative toward the end.
 */
export function normalizedScrollStart(scrollLeft: number, rtl: boolean): number {
  return rtl ? Math.abs(Math.min(0, scrollLeft)) : Math.max(0, scrollLeft)
}

/**
 * One reusable horizontal strip (plan 350): projects its content into a snap-scroller with a
 * hidden scrollbar, shows RTL-correct prev/next arrows only on the side(s) with more to see
 * (`arrows="auto"`), and fades only the edge(s) that can scroll. Content stays centered while
 * it fits (`justify-content: safe center`, overridable with `--rail-justify`).
 */
@Component({
  selector: 'app-scroll-rail',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './scroll-rail.component.html',
  styleUrl: './scroll-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'scroll-rail' }
})
export class ScrollRailComponent {
  readonly snap = input<ScrollRailSnap>('proximity')
  readonly arrows = input<ScrollRailArrows>('auto')
  /** Pixels per arrow press, or 'page' (80% of the visible width). */
  readonly step = input<number | 'page'>('page')

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller')
  private readonly destroyRef = inject(DestroyRef)

  protected readonly canPrev_ = signal(false)
  protected readonly canNext_ = signal(false)
  private readonly rtl_ = signal(false)

  protected readonly showPrev = computed(() => this.arrows() === 'always' || (this.arrows() === 'auto' && this.canPrev_()))
  protected readonly showNext = computed(() => this.arrows() === 'always' || (this.arrows() === 'auto' && this.canNext_()))

  /** Fade widths for the physical left/right edges (the mask is written in physical terms). */
  protected readonly fadeLeft = computed(() => `${(this.rtl_() ? this.canNext_() : this.canPrev_()) ? FADE_PX : 0}px`)
  protected readonly fadeRight = computed(() => `${(this.rtl_() ? this.canPrev_() : this.canNext_()) ? FADE_PX : 0}px`)

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
    })
  }

  /** Recomputes direction and which sides can still scroll. */
  update(): void {
    const el = this.scroller().nativeElement
    const rtl = getComputedStyle(el).direction === 'rtl'
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const pos = normalizedScrollStart(el.scrollLeft, rtl)
    this.rtl_.set(rtl)
    this.canPrev_.set(pos > EDGE_EPSILON_PX)
    this.canNext_.set(pos < max - EDGE_EPSILON_PX)
  }

  scrollByStep(direction: 'prev' | 'next'): void {
    const el = this.scroller().nativeElement
    const step = this.step()
    const amount = step === 'page' ? Math.max(40, el.clientWidth * 0.8) : step
    // Toward the inline end is +x in LTR and -x in RTL.
    const sign = (direction === 'next' ? 1 : -1) * (this.rtl_() ? -1 : 1)
    el.scrollBy({ left: sign * amount, behavior: 'smooth' })
  }

  /** P1: on desktop a vertical wheel over an overflowing rail scrolls it sideways (unless Shift). */
  protected onWheel(event: WheelEvent): void {
    if (event.shiftKey || !(this.canPrev_() || this.canNext_())) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const el = this.scroller().nativeElement
    el.scrollLeft += this.rtl_() ? -event.deltaY : event.deltaY
    event.preventDefault()
  }
}
