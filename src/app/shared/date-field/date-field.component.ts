import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild
} from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { formatDateDigits, isoToDmy, parseDmy } from 'src/app/core/utils/date-input.util'

const FULL_LENGTH = 10

/**
 * Plan 467: a date you can type as day/month/year (`25/12/2026`) tap-to-pick on a phone.
 * A native `<input type="date">` draws itself in the browser's language (US order on an English phone),
 * so it is only used as the hidden picker. On a touch screen (`(pointer: coarse)`) that picker is stretched over the
 * whole field, so one tap anywhere opens the phone's own date picker and the text input underneath is display-only. `value` is an ISO date (`yyyy-mm-dd`) or an empty string; a
 * impossible date leaves it empty and sets `invalid` once all ten characters are there; a half-typed date sets `invalid` when the user leaves the field.
 */
@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './date-field.component.html',
  styleUrl: './date-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateFieldComponent {
  /** ISO date (`yyyy-mm-dd`) or an empty string. */
  readonly value = model<string>('')
  /** True while ten characters are typed and they are not a real date. */
  readonly invalid = model<boolean>(false)
  readonly inputId = input<string>('')
  /** Translation key of the aria-label for the text input (use when there is no visible label). */
  readonly ariaLabelKey = input<string | null>(null)
  readonly disabled = input<boolean>(false)
  /** Fires when the user finishes: leaves the field with an empty or real date, or picks a day. Not on every key. */
  readonly committed = output<string>()

  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker')

  /** True on a touch screen: the native date input covers the field and the text input is read-only. */
  protected readonly coarse_ = signal(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
  )
  protected readonly text_ = signal('')
  protected readonly showError_ = computed(() => this.invalid())

  constructor() {
    // An outside change (a loaded event, a cleared form) rewrites the text; the field's own typing does not.
    effect(() => {
      const iso = this.value()
      const typed = untracked(() => this.text_())
      if (iso !== (parseDmy(typed) ?? '')) this.text_.set(isoToDmy(iso))
    })
  }

  protected onType(event: Event): void {
    const input = event.target as HTMLInputElement
    const text = formatDateDigits(input.value)
    input.value = text
    this.text_.set(text)
    this.apply(text)
  }

  protected onCommit(): void {
    const iso = parseDmy(this.text_())
    if (iso !== null) this.committed.emit(iso)
    else if (this.text_() === '') this.committed.emit('')
    // Leaving the field with half a date (e.g. 25/12/26) must not look saved: flag it so parents block saving.
    else this.invalid.set(true)
  }

  /** Desktop: a click on the field opens the browser's picker; typing still works. Touch is handled by the overlay. */
  protected onTextClick(): void {
    if (this.coarse_() || this.disabled()) return
    const el = this.picker().nativeElement
    if (typeof el.showPicker !== 'function') return
    try {
      el.showPicker()
    } catch {
      // showPicker throws when the browser refuses (no user gesture, cross-origin frame): typing still works.
    }
  }

  protected onPicked(event: Event): void {
    const iso = (event.target as HTMLInputElement).value
    this.text_.set(isoToDmy(iso))
    this.invalid.set(false)
    this.value.set(iso)
    this.committed.emit(iso)
  }

  private apply(text: string): void {
    const iso = parseDmy(text)
    this.invalid.set(text.length === FULL_LENGTH && iso === null)
    this.value.set(iso ?? '')
  }
}
