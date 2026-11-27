import { DestroyRef, Directive, ElementRef, computed, effect, inject, input } from '@angular/core'
import { TooltipContent, TooltipDirective } from './tooltip.directive'

/** Input types the browser's `readOnly` does nothing for; they are blocked by swallowing the press and the keys. */
const PICKER_INPUT_TYPES = new Set(['checkbox', 'radio', 'range', 'color', 'file'])
/** Input types that are buttons. */
const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image'])

type HostKind = 'press' | 'text' | 'picker'

/**
 * A control that cannot be used says why (plan 747, default `disabled-explains-why`).
 *
 * `[appDisabledWhy]="reason"` — the reason is already translated; `null` or `''` means the control works as usual.
 * With a reason the host gets `aria-disabled="true"` and the class `is-disabled`, stays reachable (hover, focus,
 * tap), its action never runs, and the reason shows in the shared tooltip, by that tooltip's rules (plan 762): on a
 * tap at phone width or with no hover; otherwise on hover and keyboard focus only. The native `disabled` attribute
 * is never set — a natively disabled control gets no pointer or focus events, so it could not explain itself. Keep
 * `[disabled]` only for "its own action is running".
 *
 * - `<button>`, `<a>` and other pressable hosts: `click` and Enter / Space are swallowed in the capture phase.
 * - `<input>` (text-like) and `<textarea>`: also `readOnly` while the reason holds; every key but Tab / Escape is
 *   swallowed.
 * - `<select>` and inputs `readOnly` does nothing for (checkbox, radio, range, color, file): `mousedown`, `click`
 *   and every key but Tab / Escape are swallowed. A checkbox or radio inside a `<label>` (a toggle chip) also shows
 *   the reason when the label is hovered, placed against the label.
 *
 * The host cannot also carry `[appTooltip]` (one tooltip per element): give its ordinary hint, shown while the
 * control works, through `[disabledWhyTip]`.
 */
@Directive({
  selector: '[appDisabledWhy]',
  standalone: true,
  hostDirectives: [{ directive: TooltipDirective, inputs: ['tooltipPlacement'] }],
  host: {
    '[attr.aria-disabled]': 'reason_() ? "true" : null',
    '[class.is-disabled]': '!!reason_()'
  }
})
export class DisabledWhyDirective {
  /** Why the control cannot be used (translated); `null` or empty = it can. */
  readonly appDisabledWhy = input<string | null>(null)
  /** The control's ordinary hint, shown while it can be used. */
  readonly disabledWhyTip = input<TooltipContent>(null)

  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly tooltip_ = inject(TooltipDirective, { self: true })

  protected readonly reason_ = computed(() => this.appDisabledWhy() || null)

  private readonly kind_ = this.kindOf_(this.host_.nativeElement)
  private readOnlyBefore_: boolean | null = null
  private addedTabindex_ = false
  /** The label around a blocked checkbox or radio: the part the user sees and hovers (a toggle chip). */
  private label_: HTMLElement | null = null

  private readonly onLabelEnter_ = (event: PointerEvent): void => this.tooltip_.onPointerEnter(event)
  private readonly onLabelLeave_ = (): void => this.tooltip_.onPointerLeave()
  /** A press on the label is a press on the control: the focus it gives is not keyboard focus. */
  private readonly onLabelPress_ = (event: PointerEvent): void => this.tooltip_.onPointerDown(event)
  private readonly onLabelCancel_ = (): void => this.tooltip_.onPointerCancel()

  private readonly onClick_ = (event: Event): void => {
    if (!this.reason_()) return
    this.swallow_(event)
    // The tooltip's own click listener sits on this element and was just stopped: pass the tap on here.
    this.tooltip_.onClick()
  }

  private readonly onKeydown_ = (event: KeyboardEvent): void => {
    if (!this.reason_()) return
    if (this.kind_ === 'press') {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') this.swallow_(event)
      return
    }
    if (event.key === 'Tab' || event.key === 'Escape') return
    // Copying the value of a read-only field stays possible.
    if (this.kind_ === 'text' && (event.ctrlKey || event.metaKey)) return
    this.swallow_(event)
  }

  private readonly onMouseDown_ = (event: Event): void => {
    if (!this.reason_() || this.kind_ !== 'picker') return
    this.swallow_(event)
  }

  constructor() {
    const element = this.host_.nativeElement
    element.addEventListener('click', this.onClick_, true)
    element.addEventListener('keydown', this.onKeydown_, true)
    element.addEventListener('mousedown', this.onMouseDown_, true)
    inject(DestroyRef).onDestroy(() => {
      element.removeEventListener('click', this.onClick_, true)
      element.removeEventListener('keydown', this.onKeydown_, true)
      element.removeEventListener('mousedown', this.onMouseDown_, true)
      this.applyLabel_(false)
    })

    effect(() => {
      const reason = this.reason_()
      this.tooltip_.hold(reason ?? this.disabledWhyTip())
    })

    effect(() => {
      const blocked = !!this.reason_()
      // A tooltip left open from the other state would keep showing the wrong text.
      this.tooltip_.close()
      this.applyReadOnly_(blocked)
      this.applyTabindex_(blocked)
      this.applyLabel_(blocked)
    })
  }

  /**
   * A blocked checkbox or radio inside a `<label>` (a toggle chip hides the input and shows the label): hovering
   * the label opens the reason and the box is placed against the label. A tap needs nothing extra — the label
   * passes its click to the input, where it is swallowed and handed to the tooltip.
   */
  private applyLabel_(blocked: boolean): void {
    const element = this.host_.nativeElement
    const type = element.tagName === 'INPUT' ? (element.getAttribute('type') ?? '').toLowerCase() : ''
    const label = blocked && (type === 'checkbox' || type === 'radio') ? element.closest('label') : null
    if (label === this.label_) return
    this.label_?.removeEventListener('pointerenter', this.onLabelEnter_)
    this.label_?.removeEventListener('pointerleave', this.onLabelLeave_)
    this.label_?.removeEventListener('pointerdown', this.onLabelPress_)
    this.label_?.removeEventListener('pointercancel', this.onLabelCancel_)
    this.label_ = label
    this.tooltip_.anchorTo(label)
    label?.addEventListener('pointerenter', this.onLabelEnter_)
    label?.addEventListener('pointerleave', this.onLabelLeave_)
    label?.addEventListener('pointerdown', this.onLabelPress_)
    label?.addEventListener('pointercancel', this.onLabelCancel_)
  }

  private swallow_(event: Event): void {
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  private kindOf_(element: HTMLElement): HostKind {
    const tag = element.tagName
    if (tag === 'TEXTAREA') return 'text'
    if (tag === 'SELECT') return 'picker'
    if (tag === 'INPUT') {
      const type = (element.getAttribute('type') ?? 'text').toLowerCase()
      if (BUTTON_INPUT_TYPES.has(type)) return 'press'
      return PICKER_INPUT_TYPES.has(type) ? 'picker' : 'text'
    }
    return 'press'
  }

  /** Text fields: read-only while the reason holds, and back to what the field was before. */
  private applyReadOnly_(blocked: boolean): void {
    if (this.kind_ !== 'text') return
    const field = this.host_.nativeElement as HTMLInputElement | HTMLTextAreaElement
    if (blocked && this.readOnlyBefore_ === null) {
      this.readOnlyBefore_ = field.readOnly
      field.readOnly = true
    } else if (!blocked && this.readOnlyBefore_ !== null) {
      field.readOnly = this.readOnlyBefore_
      this.readOnlyBefore_ = null
    }
  }

  /** A host the keyboard cannot reach on its own (not a button, link or field) is made reachable while blocked. */
  private applyTabindex_(blocked: boolean): void {
    const element = this.host_.nativeElement
    if (blocked && !element.hasAttribute('tabindex') && element.tabIndex < 0) {
      element.setAttribute('tabindex', '0')
      this.addedTabindex_ = true
    } else if (!blocked && this.addedTabindex_) {
      element.removeAttribute('tabindex')
      this.addedTabindex_ = false
    }
  }
}
