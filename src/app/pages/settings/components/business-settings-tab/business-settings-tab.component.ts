import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { BusinessNameFormComponent } from '../business-name-form/business-name-form.component'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { BUSINESS_SETTINGS_DEFAULTS, type BusinessSettings, type DealerType } from '@schemas/entities'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { MONTH_TARGET_KEYS } from '@schemas/month/month-rules'
import { MONTH_TARGET_FIELDS, bandLine } from '../../../monthly-plan/month-target-fields'

type SettingsField = Exclude<keyof BusinessSettings, 'dealerType' | 'monthTargets'>

/** All six settings the form saves: the five number fields plus the dealer type (plan 723). */
const ALL_KEYS = [
  'profitTargetPct',
  'safetyMarginPct',
  'overrunThresholdPct',
  'priceRiseAlertPct',
  'vatRatePct',
  'dealerType'
] as const

const monthTargetValidators = [Validators.required, Validators.min(0), Validators.max(100)]

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
  imports: [
    NumberBoxDirective,
    ReactiveFormsModule,
    TranslatePipe,
    BusinessNameFormComponent,
    SelectOnFocusDirective,
    CustomSelectComponent,
    DisabledWhyDirective
  ],
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
    ]),
    priceRiseAlertPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.priceRiseAlertPct, [
      Validators.required,
      Validators.min(0.1),
      Validators.max(100)
    ]),
    vatRatePct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.vatRatePct, [
      Validators.required,
      Validators.min(0),
      Validators.max(100)
    ]),
    dealerType: this.fb.control<DealerType>(BUSINESS_SETTINGS_DEFAULTS.dealerType),
    /** Plan 727: the targets a new month starts from (a month keeps its own copy). */
    monthTargets: this.fb.group({
      foodPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.monthTargets.foodPct, monthTargetValidators),
      labourPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.monthTargets.labourPct, monthTargetValidators),
      primePct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.monthTargets.primePct, monthTargetValidators),
      fixedPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.monthTargets.fixedPct, monthTargetValidators),
      profitPct: this.fb.control<number>(BUSINESS_SETTINGS_DEFAULTS.monthTargets.profitPct, monthTargetValidators)
    })
  })
  readonly monthTargetFields = MONTH_TARGET_FIELDS
  readonly dealerOptions = [
    { value: 'murshe', label: 'dealer_type_murshe' },
    { value: 'patur', label: 'dealer_type_patur' }
  ]
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
    },
    {
      key: 'priceRiseAlertPct',
      labelKey: 'price_rise_alert_pct',
      helpKey: 'price_rise_alert_help',
      errorKey: 'pct_range_overrun'
    },
    {
      key: 'vatRatePct',
      labelKey: 'vat_rate_pct',
      helpKey: 'vat_rate_help',
      errorKey: 'vat_rate_range'
    }
  ]
  protected readonly isSaving_ = signal(false)
  private readonly nameForm_ = viewChild(BusinessNameFormComponent)
  private readonly value_ = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() })

  // 5. COMPUTED
  /** The stored numbers (defaults already filled by the server). */
  private readonly stored = computed<Required<BusinessSettings>>(() => ({
    ...BUSINESS_SETTINGS_DEFAULTS,
    ...(this.businessService.business_()?.settings ?? {})
  }))

  /** Save is allowed only for a valid form that differs from what is stored. */
  protected readonly canSave = computed(() => {
    const value = this.value_()
    const stored = this.stored()
    return !this.isSaving_() && this.form.valid && this.differs(value, stored)
  })
  /** Why «שמור» cannot be used (a translation key), or null when it can. A running save is not a reason. */
  protected readonly saveWhy_ = computed<string | null>(() => {
    const value = this.value_()
    const stored = this.stored()
    if (!this.form.valid) return 'why_settings_fix_invalid'
    return this.fields.some((field) => value[field.key] !== stored[field.key]) ? null : 'why_nothing_to_save'
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
  /** True when a number differs from the stored one, or the business-name box holds an unsaved name. */
  hasRealChanges(): boolean {
    const value = this.value_()
    const stored = this.stored()
    return this.differs(value, stored) || !!this.nameForm_()?.hasRealChanges()
  }

  /** Saves the number fields and the business name (when edited); true when nothing is left unsaved. */
  async saveAll(): Promise<boolean> {
    const nameSaved = this.nameForm_()?.hasRealChanges() ? await this.nameForm_()!.save() : true
    const numbersSaved = this.differs(this.value_(), this.stored()) ? await this.save() : true
    return nameSaved && numbersSaved
  }

  /** True when the numbers were saved. */
  async save(): Promise<boolean> {
    if (!this.canSave()) return false
    this.isSaving_.set(true)
    try {
      await this.businessService.updateSettings(this.form.getRawValue())
      this.form.reset(this.stored())
      this.userMsg.onSetSuccessMsg(this.translation.translate('settings_saved'))
      return true
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
      return false
    } finally {
      this.isSaving_.set(false)
    }
  }

  /** True when any of the six settings or one of the five month targets differs from the stored one. */
  private differs(
    value: Partial<Record<(typeof ALL_KEYS)[number], unknown>> & { monthTargets?: Partial<Record<string, unknown>> },
    stored: Required<BusinessSettings>
  ): boolean {
    if (ALL_KEYS.some((key) => value[key] !== stored[key])) return true
    return MONTH_TARGET_KEYS.some((key) => value.monthTargets?.[key] !== stored.monthTargets[key])
  }

  /** «מקובל בישראל: 30–35%» under a month target. */
  protected band(key: (typeof MONTH_TARGET_KEYS)[number]): string {
    return bandLine((k) => this.translation.translate(k), key)
  }

  protected hasError(key: SettingsField): boolean {
    const control = this.form.controls[key]
    return control.invalid && (control.dirty || control.touched)
  }
}
