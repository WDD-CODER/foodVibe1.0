import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal
} from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { todayIso } from 'src/app/core/utils/date-input.util'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'

export interface DepositPaidAnswer {
  /** ISO date (`yyyy-mm-dd`) the deposit was paid. */
  date: string
  /** Amount paid, above 0. */
  amount: number
}

/**
 * Plan 467: asked when the owner moves an event to «מקדמה שולמה» — the date the deposit was paid (today by
 * default) and the amount. It only collects the answer; the stage bar moves the stage and saves the deposit.
 * «שמור» stays disabled until the date is real and the amount is above 0. Escape or a click outside cancels.
 */
@Component({
  selector: 'app-deposit-paid-dialog',
  standalone: true,
  imports: [TranslatePipe, DateFieldComponent, SelectOnFocusDirective],
  templateUrl: './deposit-paid-dialog.component.html',
  styleUrl: './deposit-paid-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancelled.emit()' }
})
export class DepositPaidDialogComponent {
  // 1. INJECTED
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)

  // 2. INPUTS
  /** What the event already holds, used to pre-fill the two fields. */
  readonly deposit = input<{ amount?: number; date?: string } | undefined>(undefined)

  // 3. OUTPUTS
  readonly confirmed = output<DepositPaidAnswer>()
  readonly cancelled = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly date_ = signal(todayIso())
  protected readonly dateInvalid_ = signal(false)
  protected readonly amountText_ = signal('')
  protected readonly isTouched_ = signal(false)

  // 5. COMPUTED
  protected readonly amount_ = computed(() => {
    const text = this.amountText_().trim()
    const amount = text === '' ? NaN : Number(text)
    return Number.isFinite(amount) && amount > 0 ? amount : null
  })
  protected readonly valid_ = computed(() => !!this.date_() && !this.dateInvalid_() && this.amount_() !== null)
  protected readonly showAmountError_ = computed(() => this.isTouched_() && this.amount_() === null)

  constructor() {
    afterNextRender(() => {
      const existing = this.deposit()
      if (existing?.date) this.date_.set(existing.date)
      if (existing?.amount) this.amountText_.set(String(existing.amount))
      this.host_.nativeElement.querySelector<HTMLInputElement>('#deposit-paid-date')?.focus()
    })
  }

  // 6. UI handlers
  protected onAmountInput(event: Event): void {
    this.amountText_.set((event.target as HTMLInputElement).value)
    this.isTouched_.set(true)
  }

  protected onSave(): void {
    this.isTouched_.set(true)
    const amount = this.amount_()
    if (!this.valid_() || amount === null) return
    this.confirmed.emit({ date: this.date_(), amount })
  }
}
