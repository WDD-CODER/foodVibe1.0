import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import type { MonthPlan, MonthPlanUpdateInput } from '@schemas/entities'
import { MONTH_TARGET_KEYS, monthKeyOf, monthLabel, shiftMonth, type MonthTargetKey } from '@schemas/month/month-rules'
import { roundMoney } from '../../core/engine/rounding'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { useUnsavedChanges } from 'src/app/core/utils/unsaved-changes'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { MONTH_TARGET_FIELDS, bandLine, isOutOfBand } from './month-target-fields'
import { MonthPlanService } from './services/month-plan.service'

type RevenueKey = 'plan' | 'actual'
type Draft = { revenue: Record<RevenueKey, number | null>; targets: Record<MonthTargetKey, number | null> }

const draftOf = (month: MonthPlan): Draft => ({ revenue: { ...month.revenue }, targets: { ...month.targets } })

/** One typed box → a number, or `null` when empty / not a number (N-M2: 0 is a real value). */
const toNumber = (value: number | string | null): number | null => {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Plan 727: the monthly plan. Opens a month (its targets and VAT copied from the business settings), shows the revenue
 * boxes and the five targets with the Israeli band beside each. All money is net of VAT, after discounts, without tips.
 */
@Component({
  selector: 'app-monthly-plan-page',
  standalone: true,
  imports: [
    FormsModule,
    NumberBoxDirective,
    TranslatePipe,
    CustomSelectComponent,
    EmptyStateComponent,
    FormFieldComponent,
    LoaderComponent,
    PageHeaderComponent
  ],
  templateUrl: './monthly-plan.page.html',
  styleUrl: './monthly-plan.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthlyPlanPage {
  // 1. INJECTED
  private readonly service_ = inject(MonthPlanService)
  private readonly router_ = inject(Router)
  private readonly route_ = inject(ActivatedRoute)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)
  private readonly logging_ = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  protected readonly targetFields = MONTH_TARGET_FIELDS
  protected readonly revenueBoxes: readonly { key: RevenueKey; labelKey: string }[] = [
    { key: 'plan', labelKey: 'mp_revenue_plan' },
    { key: 'actual', labelKey: 'mp_revenue_actual' }
  ]
  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly months_ = signal<MonthPlan[]>([])
  protected readonly open_ = signal<MonthPlan | null>(null)
  protected readonly draft_ = signal<Draft>({ revenue: { plan: null, actual: null }, targets: this.emptyTargets_() })
  protected readonly isCreating_ = signal(false)
  protected readonly newMonth_ = signal(monthKeyOf(Date.now()))
  /** «הסכום כולל מע״מ» per revenue box (plan 727 P1). */
  protected readonly includesVat_ = signal<Record<RevenueKey, boolean>>({ plan: false, actual: false })
  private readonly query_ = toSignal(this.route_.queryParamMap, { initialValue: this.route_.snapshot.queryParamMap })
  private readonly anchor_ = new FormControl(null)
  private readonly unsaved_ = useUnsavedChanges({
    form: () => this.anchor_,
    snapshot: () => JSON.stringify(this.draft_())
  })

  // 5. COMPUTED
  protected readonly monthOptions_ = computed(() =>
    this.months_().map((m) => ({ value: m.month, label: monthLabel(m.month) }))
  )
  /** Months from 12 before to 2 after the current Jerusalem month that are not stored yet. */
  protected readonly newMonthOptions_ = computed(() => {
    const stored = new Set(this.months_().map((m) => m.month))
    const current = monthKeyOf(Date.now())
    const options: { value: string; label: string }[] = []
    for (let n = -12; n <= 2; n++) {
      const key = shiftMonth(current, n)
      if (!stored.has(key)) options.push({ value: key, label: monthLabel(key) })
    }
    return options
  })
  protected readonly isClosed_ = computed(() => this.open_()?.status === 'closed')
  protected readonly canSave_ = computed(
    () => this.open_() !== null && !this.isClosed_() && !this.isSaving_() && this.hasRealChanges()
  )
  protected readonly targetsSum_ = computed(() => {
    const t = this.draft_().targets
    return [t.foodPct, t.labourPct, t.fixedPct, t.profitPct].reduce<number>((sum, v) => sum + (v ?? 0), 0)
  })
  protected readonly sumOff_ = computed(() => this.open_() !== null && Math.abs(this.targetsSum_() - 100) > 0.001)
  protected readonly sumLine_ = computed(() =>
    this.translation_.translate('mp_targets_sum').replace('{{sum}}', String(Math.round(this.targetsSum_() * 100) / 100))
  )
  protected readonly vatLine_ = computed(() => {
    const month = this.open_()
    if (!month) return ''
    return this.translation_
      .translate('mp_vat_line')
      .replace('{{rate}}', String(month.vatRatePct))
      .replace(
        '{{dealer}}',
        this.translation_.translate(month.dealerType === 'patur' ? 'dealer_type_patur' : 'dealer_type_murshe')
      )
  })

  constructor() {
    void this.load_()
  }

  // 6. METHODS
  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  async saveAndWait(): Promise<boolean> {
    return this.save()
  }

  protected label(month: string): string {
    return monthLabel(month)
  }

  protected band(key: MonthTargetKey): string {
    return bandLine((k) => this.translation_.translate(k), key)
  }

  protected outOfBand(key: MonthTargetKey): boolean {
    return isOutOfBand(key, this.draft_().targets[key])
  }

  protected setRevenue(key: RevenueKey, value: number | string | null): void {
    if (this.isClosed_()) return
    const n = toNumber(value)
    this.draft_.update((d) => ({ ...d, revenue: { ...d.revenue, [key]: n === null ? null : Math.max(0, n) } }))
  }

  protected setTarget(key: MonthTargetKey, value: number | string | null): void {
    if (this.isClosed_()) return
    const n = toNumber(value)
    this.draft_.update((d) => ({
      ...d,
      targets: { ...d.targets, [key]: n === null ? null : Math.min(100, Math.max(0, n)) }
    }))
  }

  protected toggleIncludesVat(key: RevenueKey, on: boolean): void {
    this.includesVat_.update((v) => ({ ...v, [key]: on }))
  }

  /** Divides a typed gross amount by `1 + rate / 100` once the owner leaves the box, then clears the toggle. */
  protected applyVat(key: RevenueKey): void {
    const month = this.open_()
    const value = this.draft_().revenue[key]
    if (!month || !this.includesVat_()[key]) return
    this.includesVat_.update((v) => ({ ...v, [key]: false }))
    if (value === null) return
    this.draft_.update((d) => ({
      ...d,
      revenue: { ...d.revenue, [key]: roundMoney(value / (1 + month.vatRatePct / 100)) }
    }))
  }

  protected async pick(month: string): Promise<void> {
    if (month === this.open_()?.month) return
    // The route's leave guard asks first when there are typed changes; a refusal resolves false and we stay.
    if (await this.router_.navigate([], { relativeTo: this.route_, queryParams: { month } })) this.show_(month)
  }

  protected startNew(): void {
    this.isCreating_.set(true)
    const options = this.newMonthOptions_()
    const current = monthKeyOf(Date.now())
    this.newMonth_.set(options.some((o) => o.value === current) ? current : (options[0]?.value ?? current))
  }

  protected async create(): Promise<void> {
    if (this.isSaving_()) return
    this.isSaving_.set(true)
    const month = this.newMonth_()
    try {
      const created = await this.service_.create(month)
      this.months_.update((list) => [created, ...list].sort((a, b) => b.month.localeCompare(a.month)))
      this.isCreating_.set(false)
      const moved = await this.router_.navigate([], { relativeTo: this.route_, queryParams: { month } })
      if (moved) this.show_(month)
    } catch (err) {
      if ((err as { status?: number }).status === 409) {
        await this.openStored_(month)
      } else {
        this.logging_.error('Month could not be opened', { status: (err as { status?: number }).status })
        this.userMsg_.onSetErrorMsg(this.translation_.translate('mp_save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }

  protected async save(): Promise<boolean> {
    const month = this.open_()
    if (!month || this.isClosed_()) return false
    const body = this.changes_(month)
    if (!body) return true
    this.isSaving_.set(true)
    try {
      const stored = await this.service_.update(month.month, body)
      this.months_.update((list) => list.map((m) => (m.month === stored.month ? stored : m)))
      this.open_.set(stored)
      this.draft_.set(draftOf(stored))
      this.unsaved_.markSaved()
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('mp_saved'))
      return true
    } catch (err) {
      this.logging_.error('Month could not be saved', { status: (err as { status?: number }).status })
      this.userMsg_.onSetErrorMsg(this.translation_.translate('mp_save_failed'))
      return false
    } finally {
      this.isSaving_.set(false)
    }
  }

  protected async retry(): Promise<void> {
    this.isLoading_.set(true)
    this.loadFailed_.set(false)
    await this.load_()
  }

  private async load_(): Promise<void> {
    try {
      this.months_.set(await this.service_.list())
      const wanted = this.query_().get('month')
      const first =
        wanted && this.months_().some((m) => m.month === wanted) ? wanted : (this.months_()[0]?.month ?? null)
      if (first) this.show_(first)
    } catch (err) {
      this.logging_.error('Months could not be loaded', { status: (err as { status?: number }).status })
      this.loadFailed_.set(true)
    } finally {
      this.isLoading_.set(false)
    }
  }

  private show_(month: string): void {
    const found = this.months_().find((m) => m.month === month) ?? null
    this.open_.set(found)
    this.includesVat_.set({ plan: false, actual: false })
    if (found) this.draft_.set(draftOf(found))
    this.unsaved_.markSaved()
  }

  /** A second tab opened the same month first: load the stored one and open it. */
  private async openStored_(month: string): Promise<void> {
    try {
      const stored = await this.service_.get(month)
      this.months_.update((list) =>
        [stored, ...list.filter((m) => m.month !== month)].sort((a, b) => b.month.localeCompare(a.month))
      )
      this.isCreating_.set(false)
      const moved = await this.router_.navigate([], { relativeTo: this.route_, queryParams: { month } })
      if (moved) this.show_(month)
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('mp_month_exists'))
    } catch {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('mp_load_failed'))
    }
  }

  /** Only the changed fields. An emptied target box is not sent (a target is always a number). */
  private changes_(month: MonthPlan): MonthPlanUpdateInput | null {
    const draft = this.draft_()
    const revenue: NonNullable<MonthPlanUpdateInput['revenue']> = {}
    for (const key of ['plan', 'actual'] as const)
      if (draft.revenue[key] !== month.revenue[key]) revenue[key] = draft.revenue[key]
    const targets: NonNullable<MonthPlanUpdateInput['targets']> = {}
    for (const key of MONTH_TARGET_KEYS) {
      const value = draft.targets[key]
      if (value !== null && value !== month.targets[key]) targets[key] = value
    }
    const body: MonthPlanUpdateInput = {}
    if (Object.keys(revenue).length) body.revenue = revenue
    if (Object.keys(targets).length) body.targets = targets
    return Object.keys(body).length ? body : null
  }

  private emptyTargets_(): Record<MonthTargetKey, number | null> {
    return { foodPct: null, labourPct: null, primePct: null, fixedPct: null, profitPct: null }
  }
}
