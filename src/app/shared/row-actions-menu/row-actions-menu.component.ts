import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'

interface PopoverPos {
  top?: number
  bottom?: number
  left: number
  minHeight?: number
}

/** Gap between the anchor and the popover, and the minimum distance kept from the viewport edge. */
const ANCHOR_GAP = 4
const VIEWPORT_MARGIN = 8

@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './row-actions-menu.component.html',
  styleUrl: './row-actions-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-anchored]': 'anchored()' }
})
export class RowActionsMenuComponent {
  private readonly el = inject(ElementRef)
  private readonly injector = inject(Injector)
  private readonly destroyRef = inject(DestroyRef)

  /** Popover at every width with no ⋮ trigger of its own — the host opens it with `open(anchor)`. */
  readonly anchored = input(false)

  /** Fires whenever the popover closes — an action, a tap outside, or Escape. */
  readonly closed = output<void>()

  protected readonly isOpen = signal(false)
  protected readonly popoverPos = signal<PopoverPos | null>(null)
  /** Hidden until the anchored popover has been measured and clamped, so it never flashes off-screen. */
  protected readonly isPlaced = signal(true)

  private readonly popoverEl = viewChild.required<ElementRef<HTMLElement>>('popover')
  /** Element the popover is open next to (the ⋮ trigger, or the host's anchor). Clicks on it
   *  don't count as "outside", so the host's own (dblclick) on an anchor still fires. */
  private anchor_: HTMLElement | null = null
  private stopClickAway_: (() => void) | null = null
  private readonly releaseClickAway_ = this.destroyRef.onDestroy(() => this.stopClickAway_?.())

  protected toggle(event: MouseEvent): void {
    event.stopPropagation()
    if (this.isOpen()) {
      this.close()
      return
    }
    const btn = event.currentTarget as HTMLElement
    const btnRect = btn.getBoundingClientRect()
    const row = btn.closest('.c-list-row') as HTMLElement | null
    const rowHeight = row?.getBoundingClientRect().height || btnRect.height
    this.popoverPos.set({
      bottom: window.innerHeight - btnRect.top + 2,
      left: btnRect.left + btnRect.width / 2,
      minHeight: rowHeight + 4
    })
    this.show(btn)
  }

  /** Opens the popover next to any element: above it when there is room, else below; aligned
   *  to the anchor's inline-start (right edge in RTL) and clamped inside the viewport. */
  open(anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect()
    this.isPlaced.set(false)
    this.popoverPos.set({ top: rect.bottom + ANCHOR_GAP, left: rect.left })
    this.show(anchor)
    afterNextRender(() => this.placeNextTo(anchor, rect), { injector: this.injector })
  }

  close(): void {
    if (!this.isOpen()) return
    this.stopClickAway_?.()
    this.stopClickAway_ = null
    this.anchor_ = null
    const el = this.popoverEl().nativeElement
    if (el.matches(':popover-open')) el.hidePopover()
    this.isOpen.set(false)
    this.isPlaced.set(true)
    this.popoverPos.set(null)
    this.closed.emit()
  }

  /** The popover goes in the browser's top layer (`popover="manual"`), so a backdrop-filter or
   *  transform on any ancestor (list cards, metadata cards) can't trap its position:fixed. */
  private show(anchor: HTMLElement): void {
    this.anchor_ = anchor
    if (!this.stopClickAway_) {
      // Capture phase: row actions call stopPropagation(), which would hide a bubbling click.
      const listener = (e: MouseEvent): void => this.onDocumentClick(e)
      document.addEventListener('click', listener, true)
      this.stopClickAway_ = () => document.removeEventListener('click', listener, true)
    }
    const el = this.popoverEl().nativeElement
    if (!el.matches(':popover-open')) el.showPopover()
    this.isOpen.set(true)
  }

  private placeNextTo(anchor: HTMLElement, rect: DOMRect): void {
    if (!this.isOpen()) return
    const pop = this.popoverEl().nativeElement.getBoundingClientRect()
    const isRtl = getComputedStyle(anchor).direction === 'rtl'
    const maxLeft = window.innerWidth - pop.width - VIEWPORT_MARGIN
    const left = Math.max(VIEWPORT_MARGIN, Math.min(isRtl ? rect.right - pop.width : rect.left, maxLeft))
    const above = rect.top - pop.height - ANCHOR_GAP
    const top = above >= VIEWPORT_MARGIN ? above : rect.bottom + ANCHOR_GAP
    this.popoverPos.set({ top, left })
    this.isPlaced.set(true)
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close()
  }

  /** Click-away: only listening while open, so the many per-row instances in list pages add
   *  no document listeners. A click outside closes at once; a click on an action button inside
   *  the popover closes after the click finishes, so the action's own handler runs first. The
   *  anchor is left to its owner (the ⋮ toggles itself; a chip's dblclick must still fire). */
  private onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null
    if (!target) return
    if (this.popoverEl().nativeElement.contains(target)) {
      if (target.closest('button')) setTimeout(() => this.close())
      return
    }
    if (this.anchor_?.contains(target)) return
    this.close()
  }
}
