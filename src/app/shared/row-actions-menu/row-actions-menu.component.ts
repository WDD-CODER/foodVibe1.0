import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  input,
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'

interface PopoverPos {
  /** Distance from the viewport bottom (popover above the anchor), or null when placed below. */
  bottom: number | null
  /** Distance from the viewport top (popover below the anchor), or null when placed above. */
  top: number | null
  left: number
  minHeight: number
}

/** Keeps the popover's center this far from either viewport edge (it is centered on `left`). */
const VIEWPORT_EDGE_PX = 72
/** Below this much room above the anchor, the popover opens under it instead. */
const MIN_ROOM_ABOVE_PX = 56

/**
 * Row actions: on desktop the projected buttons sit inline in the row; at ≤768px a ⋮ trigger
 * opens them in a small fixed popover anchored to the row.
 *
 * Plan 340 — also usable programmatically from any element (e.g. a metadata chip):
 * `[showTrigger]="false"` hides the ⋮ button (and the inline desktop buttons); `open(anchor)` /
 * `close()` show the popover next to that anchor at every width (`:host(.is-anchored)`),
 * clamped to the viewport.
 */
@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './row-actions-menu.component.html',
  styleUrl: './row-actions-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-anchored]': 'anchored_() || !showTrigger()' },
})
export class RowActionsMenuComponent {
  /** Show the built-in ⋮ trigger (list rows). False for menus opened via `open(anchor)`. */
  readonly showTrigger = input(true)

  protected readonly isOpen = signal(false)
  protected readonly popoverPos = signal<PopoverPos | null>(null)
  /** True while opened through `open(anchor)` — the popover then shows at every width. */
  protected readonly anchored_ = signal(false)

  /** True while the popover is open. */
  readonly opened = this.isOpen.asReadonly()

  protected toggle(event: MouseEvent): void {
    event.stopPropagation()
    if (this.isOpen()) {
      this.close()
      return
    }
    this.place(event.currentTarget as HTMLElement)
    this.anchored_.set(false)
    this.isOpen.set(true)
  }

  /** Opens the popover next to `anchor` (any element, not only a `.c-list-row` child). */
  open(anchor: HTMLElement): void {
    this.place(anchor)
    this.anchored_.set(true)
    this.isOpen.set(true)
  }

  close(): void {
    this.isOpen.set(false)
    this.anchored_.set(false)
    this.popoverPos.set(null)
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close()
  }

  private place(anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect()
    const row = anchor.closest('.c-list-row') as HTMLElement | null
    const minHeight = (row?.getBoundingClientRect().height ?? rect.height) + 4
    const viewportW = window.innerWidth
    const center = rect.left + rect.width / 2
    const left = Math.min(Math.max(center, VIEWPORT_EDGE_PX), Math.max(VIEWPORT_EDGE_PX, viewportW - VIEWPORT_EDGE_PX))
    const roomAbove = rect.top >= MIN_ROOM_ABOVE_PX
    this.popoverPos.set({
      bottom: roomAbove ? window.innerHeight - rect.top + 2 : null,
      top: roomAbove ? null : rect.bottom + 2,
      left,
      minHeight,
    })
  }
}
