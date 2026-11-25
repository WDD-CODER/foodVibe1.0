import {
  ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input
} from '@angular/core'
import { DOCUMENT } from '@angular/common'
import { placeInViewport } from 'src/app/core/utils/viewport-placement.util'
import { TooltipBoxComponent } from './tooltip-box.component'

export const TOOLTIP_HOVER_DELAY_MS = 300
export const TOOLTIP_TOUCH_HOLD_MS = 500

type TooltipContent = string | TemplateRef<unknown> | null

let nextTooltipId_ = 0
/** Closes the tooltip that is open now; only one is open at a time. */
let closeOpenTooltip_: (() => void) | null = null

/**
 * The one hint for every control (plan 744): a translated string or a template. Opens on mouse hover (after a
 * short delay), keyboard focus, a touch hold, or — with `tooltipOnClick` — a click or tap that pins it. Closes on
 * leave, blur, Escape, an outside press, scroll and destroy. The box is appended to <body> and placed with
 * `placeInViewport`.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'clearTouchTimer_()',
    '(pointercancel)': 'clearTouchTimer_()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'close()',
    '(click)': 'onClick()'
  }
})
export class TooltipDirective {
  readonly appTooltip = input<TooltipContent>(null)
  readonly tooltipPlacement = input<'above' | 'below'>('above')
  readonly tooltipOnClick = input(false)

  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly vcr_ = inject(ViewContainerRef)
  private readonly document_ = inject(DOCUMENT)

  private box_: ComponentRef<TooltipBoxComponent> | null = null
  private pinned_ = false
  private previousDescribedBy_: string | null = null
  private hoverTimer_: ReturnType<typeof setTimeout> | null = null
  private touchTimer_: ReturnType<typeof setTimeout> | null = null
  private readonly id_ = `app-tooltip-${++nextTooltipId_}`

  private readonly closeSelf_ = (): void => this.close()
  private readonly onKeydown_ = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close()
  }
  private readonly onOutsidePress_ = (event: Event): void => {
    const target = event.target as Node | null
    if (target && this.host_.nativeElement.contains(target)) return
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
      const value = this.appTooltip()
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

  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') return
    if (this.box_ || this.isEmpty_(this.appTooltip())) return
    this.clearHoverTimer_()
    this.hoverTimer_ = setTimeout(() => {
      this.hoverTimer_ = null
      this.open_(false)
    }, TOOLTIP_HOVER_DELAY_MS)
  }

  onPointerLeave(): void {
    this.clearHoverTimer_()
    if (!this.pinned_) this.close()
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    if (this.box_ || this.isEmpty_(this.appTooltip())) return
    this.clearTouchTimer_()
    this.touchTimer_ = setTimeout(() => {
      this.touchTimer_ = null
      this.open_(false)
    }, TOOLTIP_TOUCH_HOLD_MS)
  }

  onFocusIn(): void {
    if (this.box_ || this.isEmpty_(this.appTooltip())) return
    let focusVisible = false
    try {
      focusVisible = this.host_.nativeElement.matches(':focus-visible')
    } catch {
      focusVisible = false
    }
    if (focusVisible) this.open_(false)
  }

  onClick(): void {
    if (!this.tooltipOnClick() || this.isEmpty_(this.appTooltip())) return
    this.clearHoverTimer_()
    this.clearTouchTimer_()
    if (this.box_ && this.pinned_) this.close()
    else if (this.box_) this.pinned_ = true
    else this.open_(true)
  }

  close(): void {
    this.clearHoverTimer_()
    this.clearTouchTimer_()
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

  clearTouchTimer_(): void {
    if (this.touchTimer_ !== null) clearTimeout(this.touchTimer_)
    this.touchTimer_ = null
  }

  private clearHoverTimer_(): void {
    if (this.hoverTimer_ !== null) clearTimeout(this.hoverTimer_)
    this.hoverTimer_ = null
  }

  private isEmpty_(value: TooltipContent): boolean {
    return value === null || value === undefined || value === ''
  }

  private open_(pinned: boolean): void {
    const value = this.appTooltip()
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
    element.style.top = '0px'
    element.style.left = '0px'
    const size = element.getBoundingClientRect()
    const anchor = this.host_.nativeElement.getBoundingClientRect()
    const placed = placeInViewport({
      anchor: { top: anchor.top, bottom: anchor.bottom, left: anchor.left, width: anchor.width },
      panel: { width: size.width, height: size.height },
      viewport: { width: view.innerWidth, height: view.innerHeight },
      prefer: this.tooltipPlacement()
    })
    element.style.top = `${placed.top}px`
    element.style.left = `${placed.left}px`
    element.style.setProperty('--tip-arrow-x', `${placed.anchorCenterX - placed.left}px`)
    element.classList.toggle('c-tooltip--below', placed.below)
  }
}
