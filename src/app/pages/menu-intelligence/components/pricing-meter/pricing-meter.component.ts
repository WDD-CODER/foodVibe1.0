import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { ReactiveFormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import type { MenuEvent } from '@models/menu-event.model'
import { BusinessService } from '@services/business.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { PartialCostBadgeComponent } from 'src/app/shared/partial-cost-badge/partial-cost-badge.component'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import type { EventPlan } from '../../../../core/engine/event-plan.types'
import { computeEventPricing, DEFAULT_PRICING_SETTINGS, toPricingEvent } from '../../../../core/engine/event-pricing'
import { formatMoney, formatPct1 } from '../../../../core/engine/rounding'
import type { MoneyForm } from '../../menu-money-form.util'
import { MenuPortionsService } from '../../services/menu-portions.service'

/**
 * Plan 445 — the live pricing meter at the bottom of the menu page. It only displays what
 * `computeEventPricing` returns for the live form, and owns the money inputs (locked without `editMoney`).
 * Plan 487: a staff member sees nothing of it (the form stays locked); on a phone a round button opens the
 * same body in a bottom sheet instead of the fixed bar.
 */
@Component({
  selector: 'app-pricing-meter',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    ModalShellComponent,
    PartialCostBadgeComponent
  ],
  templateUrl: './pricing-meter.component.html',
  styleUrl: './pricing-meter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PricingMeterComponent {
  // 1. INJECTED
  private readonly business_ = inject(BusinessService)
  private readonly permission_ = inject(PermissionService)
  private readonly portions_ = inject(MenuPortionsService)
  private readonly translation_ = inject(TranslationService)

  // 2. INPUTS
  /** The live event built from the form (money fields included). */
  readonly event = input.required<Omit<MenuEvent, '_id'>>()
  readonly plan = input.required<EventPlan>()
  readonly moneyForm = input.required<MoneyForm>()
  readonly eventId = input<string | null>(null)

  // 4. SIGNALS
  private readonly isTargetsOpened_ = signal(false)
  private readonly isSheetOpen_ = signal(false)
  readonly isSheetOpen = this.isSheetOpen_.asReadonly()

  // 5. COMPUTED
  readonly canEditMoney_ = computed(() =>
    this.permission_.can('editMoney', { type: 'menuEvents', doc: this.eventId() ? { _id: this.eventId() } : undefined })
  )
  /** Plan 487: a signed-in staff member sees no pricing at all (owners and signed-out visitors keep the bar). */
  readonly isMoneyHidden_ = computed(() => this.permission_.isStaff_())
  /** The event holds its own target or margin (the chip turns teal). */
  readonly targetsHaveData_ = computed(() => !!this.event().targetsOverride)
  /**
   * A refused target value keeps its boxes open so the error is never out of sight. Reads `event()` so it
   * recomputes on every form change (the form itself is not a signal).
   */
  readonly targetsInvalid_ = computed(() => {
    this.event()
    const controls = this.moneyForm().controls
    return controls.profitTargetPct.invalid || controls.safetyMarginPct.invalid
  })
  /** The chip alone shows / hides the target boxes; it starts closed even when the event has a target. */
  readonly targetsOpen_ = computed(() => this.isTargetsOpened_() || this.targetsInvalid_())
  readonly result_ = computed(() =>
    computeEventPricing(
      this.plan(),
      toPricingEvent(this.event(), this.portions_.byItem()),
      this.business_.business_()?.settings ?? DEFAULT_PRICING_SETTINGS
    )
  )
  readonly hasProfitPct_ = computed(() => this.result_().profitPct !== null)
  readonly partial_ = computed(() => this.result_().partial)
  /** Revenue is 0 for lack of prices (no dish price, no price per guest) while guests are set. */
  readonly revenueNotSet_ = computed(() => this.result_().revenue === 0 && (this.event().guestCount ?? 0) > 0)
  /**
   * Why the plan is partial when no product is missing (the cost badge explains `missing`): engine errors and
   * ingredient lines without a unit conversion. Empty when not partial or when products are missing.
   */
  readonly partialReasons_ = computed<string[]>(() => {
    const plan = this.plan()
    if (!this.partial_() || plan.missing.length > 0) return []
    const errors = plan.errors.map((e) =>
      this.translation_.translate(`engine_error_${e.kind}`).replace('{name}', e.name)
    )
    const lines = plan.rawLines
      .filter((l) => l.status === 'no_conversion')
      .map((l) => `${this.translation_.translate('line_status_no_conversion')}: ${l.name}`)
    return [...errors, ...lines]
  })
  readonly pricePerGuest_ = computed(() => formatMoney(this.result_().pricePerGuest))
  readonly profitPerGuest_ = computed(() => formatMoney(this.result_().profitPerGuest))
  readonly profitPct_ = computed(() => {
    const pct = this.result_().profitPct
    return pct === null ? '—' : formatPct1(pct)
  })
  readonly minPrice_ = computed(() => formatMoney(this.result_().minPricePerGuest))
  readonly foodCost_ = computed(() => formatMoney(this.result_().foodCost))
  readonly revenue_ = computed(() => formatMoney(this.result_().revenue))
  readonly shortLabel_ = computed(() =>
    this.translation_.translate('short_per_guest').replace('{{amount}}', formatMoney(this.result_().shortfallPerGuest))
  )
  readonly marginLabel_ = computed(() =>
    this.translation_
      .translate('recommended_margin')
      .replace('{{amount}}', formatMoney(this.result_().safetyMarginAmount))
  )

  constructor() {
    effect(() => {
      const form = this.moneyForm()
      const editable = this.canEditMoney_()
      untracked(() => (editable ? form.enable({ emitEvent: false }) : form.disable({ emitEvent: false })))
    })
  }

  // 6. UI HANDLERS
  toggleTargets(): void {
    this.isTargetsOpened_.update((open) => !open)
  }

  openSheet(): void {
    this.isSheetOpen_.set(true)
  }

  closeSheet(): void {
    this.isSheetOpen_.set(false)
  }
}
