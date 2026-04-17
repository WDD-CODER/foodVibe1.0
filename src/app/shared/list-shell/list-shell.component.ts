import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  ElementRef,
  effect,
  afterNextRender,
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'

@Component({
  selector: 'app-list-shell',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListShellComponent {
  readonly isPanelOpen = input(false)
  readonly gridTemplate = input('')
  readonly mobileGridTemplate = input('')
  readonly dir = input<'rtl' | 'ltr'>('rtl')

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
