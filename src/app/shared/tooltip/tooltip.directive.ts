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
import { placeInViewport } from 'src/app/core/utils/viewport-placement.util'
import { TooltipBoxComponent } from './tooltip-box.component'

export const TOOLTIP_HOVER_DELAY_MS = 300

export type TooltipContent = string | TemplateRef<unknown> | null

let nextTooltipId_ = 0
/** Closes the tooltip that is open now; only one is open at a time. */
let closeOpenTooltip_: (() => void) | null = null

/**
 * The one hint for every control (plans 744, 747): a translated string or a template. Opens on mouse hover (after
 * a short delay), keyboard focus, or — with `tooltipOnClick` — a click that pins it. On touch (a touch pointer or a
 * device with no hover) hover does nothing: a tap on the control toggles it and a tap elsewhere closes it; the
 * control's own action still runs. Closes on leave, blur, Escape, an outside press, scroll and destroy. The box is
 * appended to <body> and placed with `placeInViewport`, whole inside the viewport on both sides.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'close()',
    '(click)': 'onClick()'
  }
})
export class TooltipDirective {
  readonly appTooltip = input<TooltipContent>(null)
  readonly tooltipPlacement = input<'above' | 'below'>('above')
  readonly tooltipOnClick = input(false)

  /** Set by a directive that composes this one (`appDisabledWhy`): its content and click rule win over the inputs. */
  private readonly held_ = signal<{ content: TooltipContent; onClick: boolean } | null>(null)
  private readonly content_ = computed<TooltipContent>(() => {
    const held = this.held_()
    return held ? held.content : this.appTooltip()
  })
  private readonly opensOnClick_ = computed(() => this.held_()?.onClick ?? this.tooltipOnClick())

  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly vcr_ = inject(ViewContainerRef)
  private readonly document_ = inject(DOCUMENT)

  private box_: ComponentRef<TooltipBoxComponent> | null = null
  private pinned_ = false
  private previousDescribedBy_: string | null = null
  private hoverTimer_: ReturnType<typeof setTimeout> | null = null
  private touchPointer_ = false
  private placeFrame_ = 0
  /** Set by a composing directive: the element the box is placed against instead of the host (see `anchorTo`). */
  private anchor_: HTMLElement | null = null
  private readonly id_ = `app-tooltip-${++nextTooltipId_}`

  private readonly closeSelf_ = (): void => this.close()
  private readonly onKeydown_ = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close()
  }
  private readonly onOutsidePress_ = (event: Event): void => {
    const target = event.target as Node | null
    if (target && (this.host_.nativeElement.contains(target) || this.anchor_?.contains(target))) return
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

  /** Touch: the last press was a finger, or the device has no hover at all. */
  private isTouch_(): boolean {
    if (this.touchPointer_) return true
    const view = this.document_.defaultView
    return !!view && typeof view.matchMedia === 'function' && view.matchMedia('(hover: none)').matches
  }

  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.touchPointer_ = true
      return
    }
    if (event.pointerType === 'mouse') this.touchPointer_ = false
    if (this.isTouch_()) return
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
    this.clearHoverTimer_()
    if (!this.pinned_) this.close()
  }

  onPointerDown(event: PointerEvent): void {
    this.touchPointer_ = event.pointerType === 'touch'
  }

  onFocusIn(): void {
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
    if (this.isEmpty_(this.content_())) return
    // On touch every control toggles by tap, whatever `tooltipOnClick` says; the control's own click still runs.
    if (!this.opensOnClick_() && !this.isTouch_()) return
    this.clearHoverTimer_()
    if (this.box_ && this.pinned_) this.close()
    else if (this.box_) this.pinned_ = true
    else this.open_(true)
  }

  /**
   * For a directive that composes this one through `hostDirectives`: gives the tooltip its content and says
   * whether a mouse click pins it, instead of the `appTooltip` / `tooltipOnClick` inputs.
   */
  hold(content: TooltipContent, onClick: boolean): void {
    this.held_.set({ content, onClick })
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
    this.document_.removeEventListener('pointerdown', this.onOutsidePress_, true)
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

  private open_(pinned: boolean): void {
    const value = this.content_()
    if (this.isEmpty_(value)) return
    if (this.box_) {
      this.pinned_ = this.pinned_ || pinned
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
    this.document_.addEventListener('pointerdown', this.onOutsidePress_, true)
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
