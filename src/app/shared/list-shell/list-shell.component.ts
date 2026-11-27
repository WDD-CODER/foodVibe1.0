import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  ElementRef,
  effect,
  afterNextRender,
  computed,
  viewChild,
  signal,
  DestroyRef
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { PHONE_QUERY } from '@utils/breakpoints'
import { ColumnCarouselGroupDirective } from '../column-carousel/column-carousel-group.directive'
import { ListColumn, fitColumns } from './list-columns.util'
import { TranslationService } from '../../core/services/translation.service'
import { PageHeaderComponent } from '../page-header/page-header.component'
import { ScrollIndicatorsDirective } from '../../core/directives/scroll-indicators.directive'

@Component({
  selector: 'app-list-shell',
  standalone: true,
  imports: [LucideAngularModule, PageHeaderComponent, ScrollIndicatorsDirective],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListShellComponent {
  readonly isPanelOpen = input(false)
  readonly gridTemplate = input('')
  readonly mobileGridTemplate = input('')
  /**
   * Plan 745: the list's declared columns. When set, the shell measures its own width, decides which columns
   * still fit as their own cell and which fall into the carousel column, and ignores both templates above.
   * `null` = today's behaviour.
   */
  readonly columns = input<readonly ListColumn[] | null>(null)
  readonly dir = input<'rtl' | 'ltr'>('rtl')
  /** `table` is the pinned-header grid; `cards` projects `[shell-cards]` as a responsive card grid (plan 453). */
  readonly layout = input<'table' | 'cards'>('table')
  /** Minimum card width for the `cards` layout. */
  readonly cardMin = input('16rem')
  /** Visible row count and unfiltered total — when both are set, the header shows the count as a
   *  pill next to the title, with "N מתוך M פריטים" as its screen-reader label (plan 352). */
  readonly resultCount = input<number | null>(null)
  readonly resultTotal = input<number | null>(null)

  private readonly translation = inject(TranslationService)

  protected readonly resultCountText = computed(() => {
    const count = this.resultCount()
    const total = this.resultTotal()
    if (count === null || total === null) return null
    return this.translation.translate('list_result_count').replace('{n}', String(count)).replace('{m}', String(total))
  })

  readonly panelToggle = output<void>()

  private readonly tableTop = viewChild<ElementRef<HTMLElement>>('tableTop')
  private readonly tableBody = viewChild<ElementRef<HTMLElement>>('tableBody')
  private readonly tableArea = viewChild<ElementRef<HTMLElement>>('tableArea')

  private readonly carouselGroup = inject(ColumnCarouselGroupDirective, { optional: true, self: true })
  private readonly destroyRef = inject(DestroyRef)

  // Measured mode (plan 745)
  private readonly width = signal<number | null>(null)
  private readonly gap = signal(0)
  private readonly phone = signal(false)
  private readonly touch = signal(false)

  private readonly fit = computed(() => {
    const columns = this.columns()
    if (!columns) return null
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const width = this.width()
    return fitColumns(columns, {
      available: width ?? Number.POSITIVE_INFINITY,
      rem,
      gap: this.gap(),
      phone: this.phone(),
      touchPhone: this.phone() && this.touch()
    })
  })

  /**
   * P1 (plan 346): after a pagination button press, bring the first row back into view —
   * the body's own scroll on desktop, the page scroll (to the pinned table top) below 1024px.
   */
  protected onPaginationClick(event: Event): void {
    if (!(event.target instanceof Element) || !event.target.closest('button')) return
    requestAnimationFrame(() => {
      const body = this.tableBody()?.nativeElement
      if (body) body.scrollTop = 0
      const top = this.tableTop()?.nativeElement
      if (top && top.getBoundingClientRect().top <= 0) top.scrollIntoView({ block: 'start' })
    })
  }

  constructor() {
    const el = inject(ElementRef)
    const host = el.nativeElement as HTMLElement

    // Block all panel transitions until after the first paint so the panel
    // snaps to its saved state without animating on every page load.
    host.classList.add('panel-init')
    afterNextRender(() => {
      requestAnimationFrame(() => host.classList.remove('panel-init'))
    })

    effect(() => {
      host.style.setProperty('--card-min', this.cardMin())
      const fit = this.fit()
      // Plan 747: a checkbox column dropped for lack of room has no track, so its cells are hidden too.
      host.classList.toggle('fit-no-select', !!fit && fit.dropped.length > 0)
      if (fit) {
        // Measured: the one template is right for the current width and phone state, so the three
        // variables the CSS picks between at each width all carry it.
        host.style.setProperty('--list-grid', fit.template)
        host.style.setProperty('--list-grid-mobile', fit.template)
        host.style.setProperty('--list-grid-mobile-touch', fit.template)
        return
      }
      host.style.setProperty('--list-grid', this.gridTemplate())
      host.style.setProperty('--list-grid-mobile', this.mobileGridTemplate())
      // Touch selects by long press, so its grid drops the trailing checkbox track. The SCSS picks
      // between the two with the same (hover: none) query that hides the checkbox cells — a JS
      // check made once at load would drift from it (devtools flips hover when inspecting).
      host.style.setProperty('--list-grid-mobile-touch', this.mobileGridTemplate().replace(/\s+28px$/, ''))
    })

    // Tell the carousel group which columns fell (null = the phone-only slide mode).
    effect(() => {
      const group = this.carouselGroup
      if (!group) return
      const fit = this.fit()
      if (!fit) {
        group.collapsed.set(null)
        return
      }
      const current = group.collapsed()
      if (!current || current.join('|') !== fit.collapsed.join('|')) group.collapsed.set(fit.collapsed)
    })

    // Watch the list's own width, at most once per animation frame.
    effect((onCleanup) => {
      const area = this.tableArea()?.nativeElement
      if (!area || !this.columns() || typeof ResizeObserver === 'undefined') return
      let frame = 0
      const measure = () => {
        frame = 0
        this.width.set(area.clientWidth)
        const gap = parseFloat(getComputedStyle(area.querySelector('.table-header') ?? area).columnGap)
        this.gap.set(Number.isNaN(gap) ? 0 : gap)
      }
      const observer = new ResizeObserver(() => {
        if (!frame) frame = requestAnimationFrame(measure)
      })
      observer.observe(area)
      measure()
      onCleanup(() => {
        observer.disconnect()
        if (frame) cancelAnimationFrame(frame)
      })
    })

    // Phone and no-hover state, the same two queries the stylesheet uses.
    const phoneQuery = window.matchMedia(PHONE_QUERY)
    const touchQuery = window.matchMedia('(hover: none)')
    const syncMedia = () => {
      this.phone.set(phoneQuery.matches)
      this.touch.set(touchQuery.matches)
    }
    syncMedia()
    phoneQuery.addEventListener('change', syncMedia)
    touchQuery.addEventListener('change', syncMedia)
    this.destroyRef.onDestroy(() => {
      phoneQuery.removeEventListener('change', syncMedia)
      touchQuery.removeEventListener('change', syncMedia)
    })
  }
}
