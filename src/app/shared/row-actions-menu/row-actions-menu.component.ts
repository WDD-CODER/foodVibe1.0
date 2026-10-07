import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationStart, Router } from '@angular/router'
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay'
import { DomPortal } from '@angular/cdk/portal'
import { filter } from 'rxjs/operators'
import { LucideAngularModule } from 'lucide-angular'

/** Gap between the anchor and the popover, in px. */
const ANCHOR_GAP_PX = 2

/**
 * Preferred placements, in order: centered above the anchor, centered below, then start- and
 * end-aligned above/below. `withPush` nudges whichever fits back inside the viewport.
 */
export const ROW_ACTIONS_POSITIONS: ConnectedPosition[] = [
  { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -ANCHOR_GAP_PX },
  { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: ANCHOR_GAP_PX },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -ANCHOR_GAP_PX },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -ANCHOR_GAP_PX },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: ANCHOR_GAP_PX },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: ANCHOR_GAP_PX },
]

/** Panel class on the overlay pane — lets global styles / tests find an open row-actions popover. */
export const ROW_ACTIONS_PANEL_CLASS = 'ram-overlay-pane'

/**
 * Row actions: on desktop the projected buttons sit inline in the row; at ≤768px a ⋮ trigger
 * opens them in a small popover anchored to the trigger.
 *
 * Plan 340 — also usable programmatically from any element (e.g. a metadata chip):
 * `[showTrigger]="false"` hides the ⋮ button (and the inline desktop buttons); `open(anchor)` /
 * `close()` show the popover next to that anchor at every width.
 *
 * Plan 362 — the popover renders through CDK Overlay at body level. Rendering it in place broke
 * inside `.table-area`: its `backdrop-filter` makes it the containing block for `position: fixed`
 * descendants and its `overflow` clipped the popover. A `DomPortal` moves the existing
 * `.ram-popover` element (with its projected buttons and live bindings) into the overlay pane and
 * puts it back on close, so desktop inline rendering is unchanged.
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

  private readonly overlay = inject(Overlay)
  private readonly router = inject(Router, { optional: true })
  private readonly destroyRef = inject(DestroyRef)
  private readonly popoverRef = viewChild.required<ElementRef<HTMLElement>>('popover')

  protected readonly isOpen = signal(false)
  /** True while opened through `open(anchor)` — the popover then shows at every width. */
  protected readonly anchored_ = signal(false)

  /** True while the popover is open. */
  readonly opened = this.isOpen.asReadonly()

  private overlayRef_: OverlayRef | null = null
  private portal_: DomPortal<HTMLElement> | null = null
  /**
   * Capture-phase click on the open popover: once an action button runs, close the menu.
   * Row actions call `stopPropagation()`, so a bubbling listener would never see the click; and
   * the body-level backdrop would otherwise sit over the edit modal the action just opened.
   */
  private readonly onPopoverClickCapture_ = (ev: MouseEvent): void => {
    const btn = (ev.target as HTMLElement | null)?.closest('button')
    if (!btn || btn.disabled) return
    setTimeout(() => this.close())
  }

  constructor() {
    // `events?.`: some list specs provide a bare Router stub without an events stream.
    this.router?.events
      ?.pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.close())
    this.destroyRef.onDestroy(() => this.disposeOverlay_())
  }

  protected toggle(event: MouseEvent): void {
    event.stopPropagation()
    if (this.isOpen()) {
      this.close()
      return
    }
    this.attach_(event.currentTarget as HTMLElement)
    this.anchored_.set(false)
  }

  /** Opens the popover next to `anchor` (any element, not only a `.c-list-row` child). */
  open(anchor: HTMLElement): void {
    this.attach_(anchor)
    this.anchored_.set(true)
  }

  close(): void {
    this.isOpen.set(false)
    this.anchored_.set(false)
    this.disposeOverlay_()
  }

  private attach_(anchor: HTMLElement): void {
    this.disposeOverlay_()
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(anchor)
      .withPositions(ROW_ACTIONS_POSITIONS)
      .withPush(true)
      .withViewportMargin(8)
      .withFlexibleDimensions(false)
    const ref = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      panelClass: ROW_ACTIONS_PANEL_CLASS,
    })
    ref.backdropClick().subscribe((ev) => {
      ev.stopPropagation()
      this.close()
    })
    ref.keydownEvents()
      .pipe(filter((ev) => ev.key === 'Escape'))
      .subscribe(() => this.close())
    const popoverEl = this.popoverRef().nativeElement
    popoverEl.addEventListener('click', this.onPopoverClickCapture_, true)
    this.portal_ = new DomPortal(popoverEl)
    this.overlayRef_ = ref
    this.isOpen.set(true)
    ref.attach(this.portal_)
  }

  private disposeOverlay_(): void {
    const ref = this.overlayRef_
    if (!ref) return
    this.overlayRef_ = null
    this.popoverRef().nativeElement.removeEventListener('click', this.onPopoverClickCapture_, true)
    // detach() first so the DomPortal returns .ram-popover to its original spot in the host.
    if (ref.hasAttached()) ref.detach()
    ref.dispose()
    this.portal_ = null
  }
}
