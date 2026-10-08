import { DOCUMENT } from '@angular/common'
import { Injectable, inject, signal } from '@angular/core'

/** Above this many px of covered viewport we treat the on-screen keyboard as open. */
export const KEYBOARD_OPEN_THRESHOLD_PX = 120
export const KEYBOARD_OPEN_CLASS = 'kb-open'
export const KEYBOARD_INSET_VAR = '--kb-inset'

/** The slice of `window` this service needs — lets the spec pass a fake visualViewport. */
export type KeyboardInsetWindow = Pick<Window, 'innerHeight' | 'visualViewport' | 'document' | 'requestAnimationFrame'>

/**
 * Tracks how much of the layout viewport the on-screen keyboard covers (plan 347).
 *
 * Writes `--kb-inset: <px>` on <html> and toggles `body.kb-open` (inset > 120px) so global
 * CSS can hide the bottom bar / FAB / toasts and lift bottom sheets above the keyboard.
 * While open, a focused input/textarea/contenteditable is scrolled to the center one frame
 * after the viewport settles. No-op where `visualViewport` is missing.
 *
 * Root singleton started once from AppComponent; its listeners live as long as the app.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardInsetService {
  private readonly document = inject(DOCUMENT)

  private readonly inset_ = signal(0)
  private readonly isOpen_ = signal(false)
  readonly inset = this.inset_.asReadonly()
  readonly isOpen = this.isOpen_.asReadonly()

  private started = false

  start(win: KeyboardInsetWindow | null = this.document.defaultView): void {
    if (this.started || !win?.visualViewport) return
    this.started = true
    const vv = win.visualViewport
    const update = (): void => this.update(win, vv)
    vv.addEventListener('resize', update, { passive: true })
    vv.addEventListener('scroll', update, { passive: true })
    win.document.addEventListener(
      'focusin',
      (e) => {
        if (this.isOpen_()) this.revealSoon(win, e.target)
      },
      { passive: true }
    )
    update()
  }

  private update(win: KeyboardInsetWindow, vv: VisualViewport): void {
    const inset = Math.max(0, Math.round(win.innerHeight - (vv.height + vv.offsetTop)))
    const wasOpen = this.isOpen_()
    const open = inset > KEYBOARD_OPEN_THRESHOLD_PX
    this.inset_.set(inset)
    this.isOpen_.set(open)
    win.document.documentElement.style.setProperty(KEYBOARD_INSET_VAR, `${inset}px`)
    win.document.body.classList.toggle(KEYBOARD_OPEN_CLASS, open)
    // Keyboard just opened for an already-focused field (the usual order on phones).
    if (open && !wasOpen) this.revealSoon(win, win.document.activeElement)
  }

  /** Centers an editable element one frame after the inset settles. */
  private revealSoon(win: KeyboardInsetWindow, target: EventTarget | null): void {
    if (!isEditable(target)) return
    win.requestAnimationFrame(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }
}

function isEditable(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable
}
