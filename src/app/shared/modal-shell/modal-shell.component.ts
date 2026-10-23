import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild
} from '@angular/core'
import { DOCUMENT } from '@angular/common'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { isTopModalShell, popModalShell, pushModalShell } from '@services/modal-controller'

export type ModalShellSize = 'sm' | 'md' | 'fluid'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

let nextTitleId = 0

/**
 * The one popup shell (plan 451): wraps the `.c-modal-overlay` / `.c-modal-card` engines and adds
 * `role="dialog"`, Escape for the top-most popup only, focus in / restore / trap.
 * Render it inside the owner's `@if (isOpen)`; content is projected into the card.
 */
@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './modal-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents',
    '(document:keydown.escape)': 'onEscape($event)'
  }
})
export class ModalShellComponent {
  private readonly document_ = inject(DOCUMENT)
  private readonly destroyRef_ = inject(DestroyRef)
  private readonly shellId_ = pushModalShell()
  private readonly opener_ = this.document_.activeElement as HTMLElement | null
  private readonly card_ = viewChild.required<ElementRef<HTMLElement>>('card')

  /** `sm` = engine default width, `md` = `.c-modal-card--md`, `fluid` = `.c-modal-card--fluid`. */
  readonly size = input<ModalShellSize>('sm')
  /** Translation key of the heading; rendered as the card's `<h3>` and used as the dialog label. */
  readonly titleKey = input<string | null>(null)
  /** Id of a heading already inside the projected content, used when `titleKey` is not set. */
  readonly labelledBy = input<string | null>(null)
  /** Translation key of an accessible name, for popups with no visible heading. */
  readonly labelKey = input<string | null>(null)
  /** Extra classes for the card (variants such as `c-modal-card--danger` or a page-specific width). */
  readonly cardClass = input<string>('')
  /** False while the popup is busy (AI generation, saving): Escape and backdrop click do nothing. */
  readonly dismissible = input(true)
  /** Stacking order override for a popup opened from inside another popup. */
  readonly zIndex = input<number | null>(null)
  /** Plan 487: on a phone the popup opens as a bottom sheet (the `.m-sheet` / `.m-sheet-card` helpers). */
  readonly sheet = input(false)
  /** Escape or a backdrop click, for the top-most dismissible popup only. */
  readonly dismissed = output<void>()

  protected readonly titleId = `modal-shell-title-${++nextTitleId}`

  constructor() {
    afterNextRender(() => this.moveFocusIn_())
    this.destroyRef_.onDestroy(() => {
      popModalShell(this.shellId_)
      this.restoreFocus_()
    })
  }

  protected onEscape(event: Event): void {
    if (event.defaultPrevented || !this.dismissible() || !isTopModalShell(this.shellId_)) return
    event.preventDefault()
    this.dismissed.emit()
  }

  protected onBackdropClick(): void {
    if (!this.dismissible() || !isTopModalShell(this.shellId_)) return
    this.dismissed.emit()
  }

  /** Keeps Tab / Shift+Tab inside the card. */
  protected onCardKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || event.defaultPrevented) return
    const card = this.card_().nativeElement
    const focusable = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === this.document_.activeElement
    )
    if (focusable.length === 0) {
      event.preventDefault()
      card.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = this.document_.activeElement
    if (event.shiftKey && (active === first || active === card)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  /** Focus goes into the card unless the content already focused one of its own fields. */
  private moveFocusIn_(): void {
    const card = this.card_().nativeElement
    if (!card.contains(this.document_.activeElement)) card.focus({ preventScroll: true })
  }

  /**
   * Focus goes back to the opener only when nothing else took it: if the caller already moved focus
   * to a live field outside this card (for example the next field of a keyboard flow), it stays there.
   */
  private restoreFocus_(): void {
    const active = this.document_.activeElement as HTMLElement | null
    const card = this.card_().nativeElement
    const focusMovedElsewhere =
      active !== null && active !== this.document_.body && active.isConnected && !card.contains(active)
    if (focusMovedElsewhere) return
    const opener = this.opener_
    if (opener && opener.isConnected && typeof opener.focus === 'function') {
      // Marks the focus as programmatic so a custom-select opener does not pop its list open again.
      opener.setAttribute('data-restore-focus', '')
      opener.focus({ preventScroll: true })
      opener.removeAttribute('data-restore-focus')
    }
  }
}
