import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  ElementRef,
  inject,
  viewChild,
  OnDestroy
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'

interface PopoverPos {
  bottom: number | null
  top: number | null
  left: number
  minHeight: number
}

@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './row-actions-menu.component.html',
  styleUrl: './row-actions-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RowActionsMenuComponent implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>)
  private readonly backdropRef = viewChild<ElementRef<HTMLElement>>('backdrop')
  private readonly popoverRef = viewChild<ElementRef<HTMLElement>>('popover')

  private portaled_ = false

  protected readonly isOpen = signal(false)
  protected readonly popoverPos = signal<PopoverPos | null>(null)

  protected toggle(event: MouseEvent): void {
    event.stopPropagation()
    if (this.isOpen()) {
      this.close()
      return
    }
    const btn = event.currentTarget as HTMLElement
    const btnRect = btn.getBoundingClientRect()
    const row = btn.closest('.c-list-row') as HTMLElement | null
    const rowHeight = row?.getBoundingClientRect().height ?? 44
    const estimatedHeight = Math.max(rowHeight + 4, 48)
    const margin = 8
    const openAbove = btnRect.top >= estimatedHeight + margin
    this.popoverPos.set({
      bottom: openAbove ? window.innerHeight - btnRect.top + 2 : null,
      top: openAbove ? null : btnRect.bottom + 2,
      left: btnRect.left + btnRect.width / 2,
      minHeight: estimatedHeight
    })
    this.isOpen.set(true)
    this.portalToBody_()
    // Double rAF: wait until `.is-open { display:flex }` has laid out measurable width
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.clampPopoverLeft_(btnRect))
    })
  }

  protected close(): void {
    this.isOpen.set(false)
    this.popoverPos.set(null)
    this.restoreToHost_()
  }

  ngOnDestroy(): void {
    this.restoreToHost_()
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close()
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected onViewportChange(): void {
    if (this.isOpen()) this.close()
  }

  /** Escape list-shell `.table-area` containing block (backdrop-filter + overflow). */
  private portalToBody_(): void {
    if (this.portaled_) return
    const backdrop = this.backdropRef()?.nativeElement
    const popover = this.popoverRef()?.nativeElement
    if (!backdrop || !popover) return
    document.body.appendChild(backdrop)
    document.body.appendChild(popover)
    this.portaled_ = true
  }

  private restoreToHost_(): void {
    if (!this.portaled_) return
    const host = this.el.nativeElement
    const backdrop = this.backdropRef()?.nativeElement
    const popover = this.popoverRef()?.nativeElement
    if (backdrop) host.appendChild(backdrop)
    if (popover) host.appendChild(popover)
    this.portaled_ = false
  }

  private clampPopoverLeft_(btnRect: DOMRect): void {
    const popover = this.popoverRef()?.nativeElement
    if (!popover) return
    const measured = popover.getBoundingClientRect().width
    // Fallback: 3×44px icons + gaps + padding (matches mobile SCSS)
    const width = measured > 0 ? measured : 3 * 44 + 2 * 2 + 2 * 4
    const margin = 8
    const half = width / 2
    const preferred = btnRect.left + btnRect.width / 2
    const minCenter = half + margin
    const maxCenter = window.innerWidth - half - margin
    const left = maxCenter >= minCenter ? Math.min(Math.max(preferred, minCenter), maxCenter) : window.innerWidth / 2
    this.popoverPos.update((pos) => (pos ? { ...pos, left } : pos))
  }
}
