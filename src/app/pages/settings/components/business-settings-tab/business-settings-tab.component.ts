import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { BUSINESS_SETTINGS_DEFAULTS, type BusinessSettings } from '@schemas/entities'

type SettingsField = keyof BusinessSettings

/** One number field of the form: its label, help text and range-error dictionary keys. */
interface FieldDef {
  key: SettingsField
  labelKey: string
  helpKey: string
  errorKey: string
}

@Component({
  selector: 'app-business-settings-tab',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './business-settings-tab.component.html',
  styleUrl: './business-settings-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BusinessSettingsTabComponent {
  // 1. INJECTED
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly businessService = inject(BusinessService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  /** Client ranges are a little stricter than the server schema: one-decimal inputs cannot express open bounds. */
  readonly form = this.fb.group({
    profitTargetPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.profitTargetPct, [
      Validators.required,
      Validators.min(0),
      Validators.max(99.9)
    ]),
    safetyMarginPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.safetyMarginPct, [
      Validators.required,
      Validators.min(0),
      Validators.max(99.9)
    ]),
    overrunThresholdPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.overrunThresholdPct, [
      Validators.required,
      Validators.min(0.1),
      Validators.max(100)
    ])
  })
  readonly fields: FieldDef[] = [
    {
      key: 'profitTargetPct',
      labelKey: 'profit_target_pct',
      helpKey: 'profit_target_help',
      errorKey: 'pct_range_0_99'
    },
    {
      key: 'safetyMarginPct',
      labelKey: 'safety_margin_pct',
      helpKey: 'safety_margin_help',
      errorKey: 'pct_range_0_99'
    },
    {
      key: 'overrunThresholdPct',
      labelKey: 'overrun_threshold_pct',
      helpKey: 'overrun_threshold_help',
      errorKey: 'pct_range_overrun'
    }
  ]
  protected readonly saving_ = signal(false)
  private readonly value_ = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() })

  // 5. COMPUTED
  /** The stored numbers (defaults already filled by the server). */
  private readonly stored = computed<BusinessSettings>(() => ({
    ...BUSINESS_SETTINGS_DEFAULTS,
    ...(this.businessService.business_()?.settings ?? {})
  }))

  /** Save is allowed only for a valid form that differs from what is stored. */
  protected readonly canSave = computed(() => {
    const value = this.value_()
    const stored = this.stored()
    return !this.saving_() && this.form.valid && this.fields.some((field) => value[field.key] !== stored[field.key])
  })

  constructor() {
    // Show the stored numbers once the business is loaded, unless the owner has already started typing.
    effect(() => {
      const stored = this.stored()
      untracked(() => {
        if (!this.form.dirty) this.form.reset(stored)
      })
    })
  }

  // 6. METHODS (UI handlers)
  async save(): Promise<void> {
    if (!this.canSave()) return
    this.saving_.set(true)
    try {
      await this.businessService.updateSettings(this.form.getRawValue())
      this.form.reset(this.stored())
      this.userMsg.onSetSuccessMsg(this.translation.translate('settings_saved'))
    } catch (err) {
      const status = (err as { status?: number }).status
      // A 403 already got the "no permission" toast from the interceptor.
      if (status === 400) {
        this.logging.warn('Business settings refused as invalid', { status })
        this.userMsg.onSetErrorMsg(this.translation.translate('settings_invalid'))
      } else if (status !== 403) {
        this.logging.error('Business settings could not be saved', { status })
        this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    } finally {
      this.saving_.set(false)
    }
  }

  protected hasError(key: SettingsField): boolean {
    const control = this.form.controls[key]
    return control.invalid && (control.dirty || control.touched)
  }
}
