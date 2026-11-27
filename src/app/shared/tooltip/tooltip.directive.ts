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
import { PHONE_QUERY } from '@utils/breakpoints'
import { placeInViewport } from 'src/app/core/utils/viewport-placement.util'
import { TooltipBoxComponent } from './tooltip-box.component'

export const TOOLTIP_HOVER_DELAY_MS = 300
/** Where a tooltip works by tap (plan 762): a phone width, or a pointer that cannot hover. Elsewhere it is hover. */
// A touch screen that cannot hover (a tablet) works by tap too; a browser with no pointer at all (headless) does not.
export const TOOLTIP_TAP_QUERY = `${PHONE_QUERY}, (hover: none) and (pointer: coarse)`

export type TooltipContent = string | TemplateRef<unknown> | null

let nextTooltipId_ = 0
/** Closes the tooltip that is open now; only one is open at a time. */
let closeOpenTooltip_: (() => void) | null = null

/**
 * The one hint for every control (plans 744, 747, 762): a translated string or a template.
 *
 * It opens on mouse hover (after a short delay) and keyboard focus, and closes on leave and blur. Above a phone a
 * click or tap never opens or pins it. On a phone, or on a device with no hover (`TOOLTIP_TAP_QUERY`), a tap on the
 * control also opens it, and that tap-opened box closes on the next press anywhere (the same control too); the
 * control's own action still runs. A finger never hovers. Always closes on Escape, on any scroll and on destroy.
 * The box is appended to <body> and placed with `placeInViewport`, whole inside the viewport on both sides.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPressStart()',
    '(pointercancel)': 'onPressCancel()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut()',
    '(click)': 'onClick()'
  }
})
export class TooltipDirective {
  readonly appTooltip = input<TooltipContent>(null)
  readonly tooltipPlacement = input<'above' | 'below'>('above')
  /** No effect since plan 762 (a click never pins; by tap every tooltip opens). Declared because templates bind it. */
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
  private previousDescribedBy_: string | null = null
  /** The open box was opened (or taken over) by a tap: leaving keeps it, the next press anywhere closes it. */
  private pinned_ = false
  private hoverTimer_: ReturnType<typeof setTimeout> | null = null
  /** The control is being pressed: the focus that comes with the press must not open the tooltip. */
  private pressed_ = false
  /** This press closed the open tooltip, so the click that ends it must not open it again. */
  private closedByPress_ = false
  private placeFrame_ = 0
  /** Set by a composing directive: the element the box is placed against instead of the host (see `anchorTo`). */
  private anchor_: HTMLElement | null = null
  private readonly id_ = `app-tooltip-${++nextTooltipId_}`

  private readonly closeSelf_ = (): void => this.close()
  private readonly onKeydown_ = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close()
  }
  /**
   * A press while open (capture phase): a press elsewhere always closes; a press on the control itself closes only
   * a tap-opened box (a hovered or focused one stays).
   */
  private readonly onPress_ = (event: Event): void => {
    const target = event.target as Node | null
    const own = !!target && (this.host_.nativeElement.contains(target) || !!this.anchor_?.contains(target))
    if (own) {
      if (!this.pinned_) return
      this.closedByPress_ = true
      this.forgetPressLater_()
    }
    this.close()
  }
  /** The next press or key ends whatever the last press left behind (a press that made no click). */
  private readonly forgetPress_ = (): void => {
    this.pressed_ = false
    this.closedByPress_ = false
    this.document_.removeEventListener('pointerdown', this.forgetPress_, true)
    this.document_.removeEventListener('keydown', this.forgetPress_, true)
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
    inject(DestroyRef).onDestroy(() => {
      this.close()
      this.forgetPress_()
    })
  }

  /** True where the tooltip works by tap; read at each event, so a resized window follows along. */
  private tapMode_(): boolean {
    const view = this.document_.defaultView
    return !!view && typeof view.matchMedia === 'function' && view.matchMedia(TOOLTIP_TAP_QUERY).matches
  }

  /** A finger, or a device that cannot hover at all, never opens by hover. A mouse always hovers, even where the
   *  main input reports `(hover: none)` (a touch laptop, a headless test browser). */
  private canHover_(event: PointerEvent): boolean {
    if (event.pointerType === 'touch') return false
    if (event.pointerType === 'mouse') return true
    const view = this.document_.defaultView
    return !(view && typeof view.matchMedia === 'function' && view.matchMedia('(hover: none)').matches)
  }

  onPointerEnter(event: PointerEvent): void {
    if (!this.canHover_(event) || this.box_ || this.isEmpty_(this.content_())) return
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
    this.clearHoverTimer_()
    // A tap-opened box stays when the finger lifts; the next press or a scroll closes it.
    if (!this.pinned_) this.close()
  }

  onPressStart(): void {
    this.pressed_ = true
    this.forgetPressLater_()
  }

  onPressCancel(): void {
    this.forgetPress_()
  }

  onFocusIn(): void {
    if (this.pressed_ || this.box_ || this.isEmpty_(this.content_())) return
    let focusVisible = false
    try {
      focusVisible = this.host_.nativeElement.matches(':focus-visible')
    } catch {
      focusVisible = false
    }
    if (focusVisible) this.open_(false)
  }

  onFocusOut(): void {
    this.pressed_ = false
    this.close()
  }

  onClick(): void {
    const closedByThisPress = this.closedByPress_
    this.forgetPress_()
    // Above a phone a click never opens or pins. By tap it does, and the control's own click still runs.
    if (closedByThisPress || !this.tapMode_()) return
    this.clearHoverTimer_()
    if (!this.box_) this.open_(true)
    // A click with no press before it (the keyboard, assistive tech) closes an open tap box.
    else if (this.pinned_) this.close()
    else this.pinned_ = true
  }

  /**
   * For a directive that composes this one through `hostDirectives`: gives the tooltip its content instead of the
   * `appTooltip` input.
   */
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
    this.pinned_ = false
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

  /** Added while a press is being dispatched, these do not fire for that press: only for what comes after it. */
  private forgetPressLater_(): void {
    this.document_.addEventListener('pointerdown', this.forgetPress_, true)
    this.document_.addEventListener('keydown', this.forgetPress_, true)
  }

  private open_(pinned: boolean): void {
    const value = this.content_()
    if (this.box_ || this.isEmpty_(value)) return
    closeOpenTooltip_?.()
    const box = this.vcr_.createComponent(TooltipBoxComponent)
    box.setInput('boxId', this.id_)
    box.setInput('direction', this.document_.documentElement.dir || this.document_.dir || 'rtl')
    box.setInput('content', value)
    box.changeDetectorRef.detectChanges()
    const element = box.location.nativeElement as HTMLElement
    this.document_.body.appendChild(element)
    this.box_ = box
    this.pinned_ = pinned
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
