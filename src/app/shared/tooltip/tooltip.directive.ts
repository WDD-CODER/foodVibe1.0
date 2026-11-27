import {
  ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core'
import { DOCUMENT } from '@angular/common'
import { PHONE_QUERY } from 'src/app/core/utils/breakpoints'
import { placeInViewport } from 'src/app/core/utils/viewport-placement.util'
import { TooltipBoxComponent } from './tooltip-box.component'

export const TOOLTIP_HOVER_DELAY_MS = 300

export type TooltipContent = string | TemplateRef<unknown> | null

let nextTooltipId_ = 0
/** Closes the tooltip that is open now; only one is open at a time. */
let closeOpenTooltip_: (() => void) | null = null

/**
 * The one hint for every control (plans 744, 747, 762): a translated string or a template. The screen decides how
 * it opens:
 * - Tap mode (phone width, or a device with no hover): a tap on the control opens it — the control's own action
 *   still runs — and the next press anywhere (the same control too) or any scroll closes it.
 * - Otherwise: a click or a tap never opens or pins it.
 * In both, a mouse hover (after a short delay; not on a device with no hover) or keyboard focus opens it, and leave
 * or blur closes a box no tap opened. Escape, scroll and destroy close it. The box is appended to <body> and placed with `placeInViewport`,
 * whole inside the viewport on both sides.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointercancel)': 'onPointerCancel()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'close()',
    '(click)': 'onClick()'
  }
})
export class TooltipDirective {
  readonly appTooltip = input<TooltipContent>(null)
  readonly tooltipPlacement = input<'above' | 'below'>('above')
  /** No effect since plan 762 (no click pins a tooltip); kept because templates still bind it. */
  readonly tooltipOnClick = input(false)

  /** Set by a directive that composes this one (`appDisabledWhy`): its content wins over `appTooltip`. */
  private readonly held_ = signal<{ content: TooltipContent } | null>(null)
  private readonly content_ = computed<TooltipContent>(() => {
    const held = this.held_()
    return held ? held.content : this.appTooltip()
  })

  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly vcr_ = inject(ViewContainerRef)
  private readonly document_ = inject(DOCUMENT)

  private box_: ComponentRef<TooltipBoxComponent> | null = null
  /** The open box was opened by a tap: the pointer leaving the control does not close it. */
  private tapped_ = false
  /** A press on the control that has not ended in a click yet: had a tap's tooltip been open when it began? */
  private openAtPress_: boolean | null = null
  /** The last press on the control itself that closed the box (see `onPress_`). */
  private closingPress_: Event | null = null
  private previousDescribedBy_: string | null = null
  private hoverTimer_: ReturnType<typeof setTimeout> | null = null
  private placeFrame_ = 0
  /** Set by a composing directive: the element the box is placed against instead of the host (see `anchorTo`). */
  private anchor_: HTMLElement | null = null
  private readonly id_ = `app-tooltip-${++nextTooltipId_}`

  private readonly closeSelf_ = (): void => this.close()
  private readonly onKeydown_ = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close()
  }
  /**
   * A press anywhere while the box is open closes it, except a press on the control itself — that one closes only
   * a box a tap opened (tap mode), and is remembered so the click that follows does not open it again.
   */
  private readonly onPress_ = (event: Event): void => {
    const target = event.target as Node | null
    const onControl = !!target && (this.host_.nativeElement.contains(target) || !!this.anchor_?.contains(target))
    if (onControl) {
      if (!this.tapped_) return
      this.openAtPress_ = true
      this.closingPress_ = event
    }
    this.close()
  }
  private readonly onScroll_ = (event: Event): void => {
    const target = event.target as Node | null
    const box = this.box_?.location.nativeElement as HTMLElement | undefined
    if (target && box && box.contains(target)) return
    this.close()
  }
  private readonly onResize_ = (): void => this.place_()

  constructor() {
    effect(() => {
      const value = this.content_()
      if (!this.box_) return
      if (this.isEmpty_(value)) {
        this.close()
        return
      }
      this.box_.setInput('content', value)
      this.box_.changeDetectorRef.detectChanges()
      this.place_()
    })
    inject(DestroyRef).onDestroy(() => this.close())
  }

  private matches_(query: string): boolean {
    const view = this.document_.defaultView
    return !!view && typeof view.matchMedia === 'function' && view.matchMedia(query).matches
  }

  /** Tap mode: a phone-wide screen, or a device with no hover at all. */
  private isTapMode_(): boolean {
    return this.matches_(PHONE_QUERY) || this.matches_('(hover: none)')
  }

  onPointerEnter(event: PointerEvent): void {
    // A finger does not hover, and a device with no hover has none to show.
    if (event.pointerType === 'touch' || this.matches_('(hover: none)')) return
    if (this.box_ || this.isEmpty_(this.content_())) return
    this.clearHoverTimer_()
    this.hoverTimer_ = setTimeout(() => {
      this.hoverTimer_ = null
      this.open_(false)
    }, TOOLTIP_HOVER_DELAY_MS)
  }

  onPointerLeave(event?: PointerEvent): void {
    // Leaving the host into its own anchor (a checkbox into the label around it) is not leaving the control.
    const next = event?.relatedTarget as Node | null | undefined
    if (next && this.anchor_?.contains(next)) return
    // A mouse dragged off the control ends the press with no click. (A finger leaves before its click arrives.)
    if (event?.pointerType === 'mouse') this.openAtPress_ = null
    this.clearHoverTimer_()
    if (!this.tapped_) this.close()
  }

  onPointerDown(event: PointerEvent): void {
    this.openAtPress_ = this.tapped_ || event === this.closingPress_
  }

  /** The press turned into a scroll or another gesture: no click follows. */
  onPointerCancel(): void {
    this.openAtPress_ = null
  }

  onFocusIn(): void {
    // Focus that comes from a press is not keyboard focus: the press rules decide.
    if (this.openAtPress_ !== null) return
    if (this.box_ || this.isEmpty_(this.content_())) return
    let focusVisible = false
    try {
      focusVisible = this.host_.nativeElement.matches(':focus-visible')
    } catch {
      focusVisible = false
    }
    if (focusVisible) this.open_(false)
  }

  onClick(): void {
    const wasOpen = this.openAtPress_ ?? this.tapped_
    this.openAtPress_ = null
    // With a hovering pointer a click opens nothing and pins nothing.
    if (!this.isTapMode_() || this.isEmpty_(this.content_())) return
    this.clearHoverTimer_()
    if (wasOpen) this.close()
    else this.open_(true)
  }

  /** For a directive that composes this one through `hostDirectives`: gives the tooltip its content. */
  hold(content: TooltipContent): void {
    this.held_.set({ content })
  }

  /**
   * For a directive that composes this one: places the box against another element (the visible label around a
   * hidden input) and counts a press on it as a press on the control. `null` goes back to the host.
   */
  anchorTo(element: HTMLElement | null): void {
    this.anchor_ = element
  }

  close(): void {
    this.clearHoverTimer_()
    if (this.placeFrame_) cancelAnimationFrame(this.placeFrame_)
    this.placeFrame_ = 0
    const box = this.box_
    if (!box) return
    this.box_ = null
    this.tapped_ = false
    if (closeOpenTooltip_ === this.closeSelf_) closeOpenTooltip_ = null
    this.document_.removeEventListener('keydown', this.onKeydown_)
    this.document_.removeEventListener('pointerdown', this.onPress_, true)
    this.document_.removeEventListener('scroll', this.onScroll_, true)
    this.document_.defaultView?.removeEventListener('resize', this.onResize_)
    const element = this.host_.nativeElement
    if (this.previousDescribedBy_ === null) element.removeAttribute('aria-describedby')
    else element.setAttribute('aria-describedby', this.previousDescribedBy_)
    this.previousDescribedBy_ = null
    const boxElement = box.location.nativeElement as HTMLElement
    box.destroy()
    boxElement.remove()
  }

  private clearHoverTimer_(): void {
    if (this.hoverTimer_ !== null) clearTimeout(this.hoverTimer_)
    this.hoverTimer_ = null
  }

  private isEmpty_(value: TooltipContent): boolean {
    return value === null || value === undefined || value === ''
  }

  private open_(tapped: boolean): void {
    const value = this.content_()
    if (this.isEmpty_(value)) return
    if (this.box_) {
      this.tapped_ = this.tapped_ || tapped
      return
    }
    closeOpenTooltip_?.()
    const box = this.vcr_.createComponent(TooltipBoxComponent)
    box.setInput('boxId', this.id_)
    box.setInput('direction', this.document_.documentElement.dir || this.document_.dir || 'rtl')
    box.setInput('content', value)
    box.changeDetectorRef.detectChanges()
    const element = box.location.nativeElement as HTMLElement
    this.document_.body.appendChild(element)
    this.box_ = box
    this.tapped_ = tapped
    closeOpenTooltip_ = this.closeSelf_
    const host = this.host_.nativeElement
    this.previousDescribedBy_ = host.getAttribute('aria-describedby')
    host.setAttribute('aria-describedby', this.id_)
    try {
      element.showPopover()
    } catch {
      // No popover support: the fixed box still shows, just not in the top layer.
    }
    this.place_()
    // Measure again once the box has painted: its content and fonts may have changed its width.
    this.placeFrame_ = requestAnimationFrame(() => {
      this.placeFrame_ = 0
      this.place_()
    })
    this.document_.addEventListener('keydown', this.onKeydown_)
    this.document_.addEventListener('pointerdown', this.onPress_, true)
    this.document_.addEventListener('scroll', this.onScroll_, true)
    this.document_.defaultView?.addEventListener('resize', this.onResize_)
  }

  private place_(): void {
    if (!this.box_) return
    const element = this.box_.location.nativeElement as HTMLElement
    const view = this.document_.defaultView
    if (!view) return
    // Measured at the corner, where the box is as wide as its text wants (never squeezed by the room beside it).
    element.style.top = '0px'
    element.style.left = '0px'
    const size = element.getBoundingClientRect()
    const anchor = (this.anchor_ ?? this.host_.nativeElement).getBoundingClientRect()
    // The visible width: without the page scrollbar, which the box must not slide under.
    const viewWidth = this.document_.documentElement.clientWidth || view.innerWidth
    const placed = placeInViewport({
      anchor: { top: anchor.top, bottom: anchor.bottom, left: anchor.left, width: anchor.width },
      panel: { width: size.width, height: size.height },
      viewport: { width: viewWidth, height: view.innerHeight },
      prefer: this.tooltipPlacement()
    })
    element.style.top = `${placed.top}px`
    element.style.left = `${placed.left}px`
    const arrowX = Math.max(10, Math.min(size.width - 10, placed.anchorCenterX - placed.left))
    element.style.setProperty('--tip-arrow-x', `${arrowX}px`)
    element.classList.toggle('c-tooltip--below', placed.below)
  }
}
