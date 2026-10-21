import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import type { MenuEvent } from '@models/menu-event.model'
import { BusinessService } from '@services/business.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
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
 */
@Component({
  selector: 'app-pricing-meter',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, TranslatePipe, PartialCostBadgeComponent],
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
  private readonly targetsOpened_ = signal(false)
  readonly expanded_ = signal(false)

  // 5. COMPUTED
  readonly canEditMoney_ = computed(() =>
    this.permission_.can('editMoney', { type: 'menuEvents', doc: this.eventId() ? { _id: this.eventId() } : undefined })
  )
  /** The target inputs show when the chef opened them or the event already has its own target. */
  readonly targetsOpen_ = computed(() => this.targetsOpened_() || !!this.event().targetsOverride)
  readonly result_ = computed(() =>
    computeEventPricing(
      this.plan(),
      toPricingEvent(this.event(), this.portions_.byItem()),
      this.business_.business_()?.settings ?? DEFAULT_PRICING_SETTINGS
    )
  )
  readonly hasProfitPct_ = computed(() => this.result_().profitPct !== null)
  readonly partial_ = computed(() => this.result_().partial)
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
    this.targetsOpened_.update((open) => !open)
  }

  toggleExpanded(): void {
    this.expanded_.update((open) => !open)
  }
}
