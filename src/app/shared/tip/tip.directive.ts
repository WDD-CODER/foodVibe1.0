import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core'
import { DOCUMENT } from '@angular/common'
import { placeInViewport } from 'src/app/core/utils/viewport-placement.util'

/** How long a tip opened by a tap stays up. */
export const TIP_TAP_MS = 3000

let nextTipId = 0

/**
 * Plan 699: a short explanation shown at once beside its control — on hover, on keyboard focus, and for 3 s after a
 * tap — instead of the native `title` (late, mouse-only). The bubble (`.c-tip`, `src/styles.scss`) lives in the
 * popover top layer, so no scroll box clips it, and `placeInViewport` keeps it inside the screen (below the control
 * unless there is no room). While shown, the host's `aria-describedby` names it. Empty or null text shows nothing.
 */
@Directive({
  selector: '[appTip]',
  standalone: true,
  host: {
    '(mouseenter)': 'show()',
    '(focusin)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusout)': 'hide()',
    '(click)': 'onTap()'
  }
})
export class TipDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly doc = inject(DOCUMENT)

  readonly appTip = input<string | null>()

  /** The bubble's id (also what `aria-describedby` gets). */
  readonly tipId = `app-tip-${++nextTipId}`
  private bubble: HTMLElement | null = null
  private tapTimer: ReturnType<typeof setTimeout> | null = null
  private shown = false

  private readonly onScroll = (): void => this.hide()
  private readonly onResize = (): void => this.place()
  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.hide()
  }

  constructor() {
    // A text that changes while shown is updated in place; a text that empties hides the tip.
    effect(() => {
      const text = this.text()
      if (!this.shown) return
      if (!text) this.hide()
      else if (this.bubble) {
        this.bubble.textContent = text
        this.place()
      }
    })
    inject(DestroyRef).onDestroy(() => {
      this.hide()
      this.bubble?.remove()
      this.bubble = null
    })
  }

  private text(): string {
    return (this.appTip() ?? '').trim()
  }

  show(): void {
    const text = this.text()
    if (!text) return
    const bubble = this.ensureBubble()
    bubble.textContent = text
    if (!this.shown) {
      this.shown = true
      if (!bubble.matches(':popover-open')) bubble.showPopover()
      this.describe(true)
      const win = this.doc.defaultView
      win?.addEventListener('scroll', this.onScroll, true)
      win?.addEventListener('resize', this.onResize)
      win?.addEventListener('keydown', this.onKey)
    }
    this.place()
  }

  hide(): void {
    this.clearTimer()
    if (!this.shown) return
    this.shown = false
    const bubble = this.bubble
    if (bubble?.matches(':popover-open')) bubble.hidePopover()
    this.describe(false)
    const win = this.doc.defaultView
    win?.removeEventListener('scroll', this.onScroll, true)
    win?.removeEventListener('resize', this.onResize)
    win?.removeEventListener('keydown', this.onKey)
  }

  /** A tap (or a click) shows the tip for a short while: touch has no hover. */
  onTap(): void {
    if (!this.text()) return
    this.show()
    this.clearTimer()
    this.tapTimer = setTimeout(() => this.hide(), TIP_TAP_MS)
  }

  private clearTimer(): void {
    if (this.tapTimer !== null) clearTimeout(this.tapTimer)
    this.tapTimer = null
  }

  private ensureBubble(): HTMLElement {
    if (this.bubble) return this.bubble
    const bubble = this.doc.createElement('div')
    bubble.className = 'c-tip'
    bubble.id = this.tipId
    bubble.setAttribute('role', 'tooltip')
    bubble.setAttribute('popover', 'manual')
    this.doc.body.appendChild(bubble)
    this.bubble = bubble
    return bubble
  }

  /** Adds or removes the bubble's id in the host's `aria-describedby`, keeping any id already there. */
  private describe(on: boolean): void {
    const el = this.host.nativeElement
    const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id && id !== this.tipId)
    if (on) ids.push(this.tipId)
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '))
    else el.removeAttribute('aria-describedby')
  }

  private place(): void {
    const bubble = this.bubble
    const win = this.doc.defaultView
    if (!bubble || !this.shown || !win) return
    const anchor = this.host.nativeElement.getBoundingClientRect()
    const size = bubble.getBoundingClientRect()
    const placed = placeInViewport({
      anchor,
      panel: { width: size.width, height: size.height },
      viewport: { width: win.innerWidth, height: win.innerHeight },
      prefer: 'below'
    })
    bubble.style.top = `${placed.top}px`
    bubble.style.left = `${placed.left}px`
  }
}
