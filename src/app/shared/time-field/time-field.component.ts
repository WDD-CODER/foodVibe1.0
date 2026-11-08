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
import { formatTimeDigits, parseHm } from 'src/app/core/utils/time-input.util'

/**
 * Plan 537: a 24-hour time you can type (`0830` becomes `08:30`) or pick. Same structure as `app-date-field`:
 * a native `<input type="time">` draws AM/PM on an English phone, so it is only the hidden picker. On a touch screen it
 * covers the field, so a tap opens the phone's own picker. `value` is `HH:MM` or an empty string; a half-typed or
 * impossible time leaves it empty and sets `invalid` when the user leaves the field.
 */
@Component({
  selector: 'app-time-field',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './time-field.component.html',
  styleUrl: './time-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeFieldComponent {
  /** `HH:MM` (24-hour) or an empty string. */
  readonly value = model<string>('')
  /** True once the user left the field with a half-typed or impossible time. */
  readonly invalid = model<boolean>(false)
  readonly inputId = input<string>('')
  /** Translation key of the aria-label for the text input (no visible label). */
  readonly ariaLabelKey = input<string | null>(null)
  readonly disabled = input<boolean>(false)
  /** The parent marks the field red without this field's own message (used for row errors). */
  readonly flagged = input<boolean>(false)
  /** Fires when the user finishes: leaves the field with an empty or real time, or picks one. */
  readonly committed = output<string>()

  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker')

  protected readonly coarse_ = signal(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
  )
  protected readonly text_ = signal('')
  protected readonly showError_ = computed(() => this.invalid())
  protected readonly red_ = computed(() => this.invalid() || this.flagged())

  constructor() {
    // An outside change (a loaded venue, a cleared form) rewrites the text; the field's own typing does not.
    effect(() => {
      const hm = this.value()
      const typed = untracked(() => this.text_())
      if (hm !== (parseHm(typed) ?? '')) this.text_.set(hm)
    })
  }

  protected onType(event: Event): void {
    const el = event.target as HTMLInputElement
    const text = formatTimeDigits(el.value)
    el.value = text
    this.text_.set(text)
    this.invalid.set(false)
    this.value.set(parseHm(text) ?? '')
  }

  protected onCommit(): void {
    const hm = parseHm(this.text_())
    if (hm !== null) this.committed.emit(hm)
    else if (this.text_() === '') this.committed.emit('')
    else this.invalid.set(true)
  }

  /** Desktop: a click opens the browser's picker; typing still works. Touch is handled by the overlay. */
  protected onTextClick(): void {
    if (this.coarse_() || this.disabled()) return
    const el = this.picker().nativeElement
    if (typeof el.showPicker !== 'function') return
    try {
      el.showPicker()
    } catch {
      // showPicker throws when the browser refuses: typing still works.
    }
  }

  protected onPicked(event: Event): void {
    const hm = parseHm((event.target as HTMLInputElement).value) ?? ''
    this.text_.set(hm)
    this.invalid.set(false)
    this.value.set(hm)
    this.committed.emit(hm)
  }
}
