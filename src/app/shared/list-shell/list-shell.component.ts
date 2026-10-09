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
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslationService } from '../../core/services/translation.service'
import { PageHeaderComponent } from '../page-header/page-header.component'
import { isTouchDevice } from 'src/app/shared/list-selection/touch-row-selection'

@Component({
  selector: 'app-list-shell',
  standalone: true,
  imports: [LucideAngularModule, PageHeaderComponent],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListShellComponent {
  readonly isPanelOpen = input(false)
  readonly gridTemplate = input('')
  readonly mobileGridTemplate = input('')
  readonly dir = input<'rtl' | 'ltr'>('rtl')
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
      host.style.setProperty('--list-grid', this.gridTemplate())
      // Touch selects by long press, so the phone grid drops its trailing checkbox track.
      const mobile = isTouchDevice() ? this.mobileGridTemplate().replace(/\s+28px$/, '') : this.mobileGridTemplate()
      host.style.setProperty('--list-grid-mobile', mobile)
    })
  }
}
