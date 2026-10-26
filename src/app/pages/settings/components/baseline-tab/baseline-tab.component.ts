import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { DatePipe } from '@angular/common'
import { toSignal } from '@angular/core/rxjs-interop'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { BaselineInput } from '@schemas/entities'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'

type BaselineField = keyof BaselineInput

/** One optional number field of the form: its label and the suffix shown inside the input. */
interface FieldDef {
  key: BaselineField
  labelKey: string
  suffix: string
}

@Component({
  selector: 'app-baseline-tab',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, DatePipe, SelectOnFocusDirective],
  templateUrl: './baseline-tab.component.html',
  styleUrl: './baseline-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaselineTabComponent {
  // 1. INJECTED
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly businessService = inject(BusinessService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  /** Every number is optional: an empty box is `null` and is not sent. */
  readonly form = this.fb.group({
    inquiriesPerMonth: this.fb.control<number | null>(null, [Validators.min(0)]),
    eventsClosedPerMonth: this.fb.control<number | null>(null, [Validators.min(0)]),
    avgRevenuePerEvent: this.fb.control<number | null>(null, [Validators.min(0)]),
    // The server accepts only values strictly between -100 and 100.
    estProfitPct: this.fb.control<number | null>(null, [Validators.min(-99.99), Validators.max(99.99)])
  })
  readonly fields: FieldDef[] = [
    { key: 'inquiriesPerMonth', labelKey: 'baseline_inquiries_per_month', suffix: '' },
    { key: 'eventsClosedPerMonth', labelKey: 'baseline_events_closed_per_month', suffix: '' },
    { key: 'avgRevenuePerEvent', labelKey: 'baseline_avg_revenue_per_event', suffix: '₪' },
    { key: 'estProfitPct', labelKey: 'baseline_est_profit_pct', suffix: '%' }
  ]
  protected readonly isSaving_ = signal(false)
  private readonly queryParams_ = toSignal(this.route.queryParams, { initialValue: {} as Record<string, string> })
  private readonly value_ = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() })

  // 5. COMPUTED
  /** True on the owner's first visit: the page offers the skip button and leaves for the dashboard afterwards. */
  protected readonly first = computed(() => this.queryParams_()['first'] === '1')
  private readonly stored = computed(() => this.businessService.business_()?.baseline)
  /** The date the numbers were stored, or null when the baseline is missing or was skipped (no numbers). */
  protected readonly filledAt = computed(() => {
    const stored = this.stored()
    return stored && this.fields.some((field) => stored[field.key] !== undefined) ? stored.filledAt : null
  })
  protected readonly canSave = computed(() => {
    const value = this.value_()
    return (
      !this.isSaving_() && this.form.valid && (this.form.dirty || this.fields.some((field) => value[field.key] != null))
    )
  })

  constructor() {
    // Show the stored numbers once the business is loaded, unless the owner has already started typing.
    effect(() => {
      const stored = this.stored()
      untracked(() => {
        if (this.form.dirty) return
        this.form.reset({
          inquiriesPerMonth: stored?.inquiriesPerMonth ?? null,
          eventsClosedPerMonth: stored?.eventsClosedPerMonth ?? null,
          avgRevenuePerEvent: stored?.avgRevenuePerEvent ?? null,
          estProfitPct: stored?.estProfitPct ?? null
        })
      })
    })
  }

  // 6. METHODS (UI handlers)
  /** Sends only the filled fields. After the first visit's save the owner continues to the dashboard. */
  async save(): Promise<void> {
    if (!this.canSave()) return
    const raw = this.form.getRawValue()
    const input: BaselineInput = {}
    for (const field of this.fields) {
      const value = raw[field.key]
      if (value != null) input[field.key] = value
    }
    if (await this.send(input)) {
      this.form.markAsPristine()
      this.userMsg.onSetSuccessMsg(this.translation.translate('baseline_saved'))
      if (this.first()) void this.router.navigate(['/dashboard'])
    }
  }

  /** Skip: stores an empty baseline so the screen never opens by itself again, then goes to the dashboard. */
  async skip(): Promise<void> {
    if (this.isSaving_()) return
    if (await this.send({})) void this.router.navigate(['/dashboard'])
  }

  protected hasError(key: BaselineField): boolean {
    const control = this.form.controls[key]
    return control.invalid && (control.dirty || control.touched)
  }

  private async send(input: BaselineInput): Promise<boolean> {
    this.isSaving_.set(true)
    try {
      await this.businessService.updateBaseline(input)
      return true
    } catch (err) {
      const status = (err as { status?: number }).status
      // A 403 already got the "no permission" toast from the interceptor.
      if (status === 400) {
        this.logging.warn('Baseline refused as invalid', { status })
        this.userMsg.onSetErrorMsg(this.translation.translate('settings_invalid'))
      } else if (status !== 403) {
        this.logging.error('Baseline could not be saved', { status })
        this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
      return false
    } finally {
      this.isSaving_.set(false)
    }
  }
}
