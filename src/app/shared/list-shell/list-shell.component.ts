import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  ElementRef,
  effect,
  afterNextRender,
  computed
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from '../../core/pipes/translation-pipe.pipe'
import { TranslationService } from '../../core/services/translation.service'

@Component({
  selector: 'app-list-shell',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListShellComponent {
  readonly isPanelOpen = input(false)
  readonly gridTemplate = input('')
  readonly mobileGridTemplate = input('')
  readonly dir = input<'rtl' | 'ltr'>('rtl')
  /** Visible row count and unfiltered total — when both are set, the shell renders
   *  the design's "N מתוך M פריטים" subtitle under the title. Omit either to hide it. */
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

  private touchStartX = 0
  private touchStartY = 0
  private readonly SWIPE_THRESHOLD = 50

  protected onPanelTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX
    this.touchStartY = event.touches[0].clientY
  }

  protected onPanelTouchEnd(event: TouchEvent): void {
    const deltaX = event.changedTouches[0].clientX - this.touchStartX
    const deltaY = Math.abs(event.changedTouches[0].clientY - this.touchStartY)
    // Panel slides in from the right — swipe right to dismiss
    if (deltaX > this.SWIPE_THRESHOLD && Math.abs(deltaX) > deltaY) {
      this.panelToggle.emit()
    }
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
      host.style.setProperty('--list-grid-mobile', this.mobileGridTemplate())
    })
  }
}
