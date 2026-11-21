import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { buildMarginReport, type MarginFinding } from '@schemas/diag/margin-report'
import type { VolatilityRow } from '@schemas/diag/volatility'
import type { Diagnosis } from '@schemas/entities'
import { BUSINESS_SETTINGS_DEFAULTS } from '@schemas/entities'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { DishDataService } from '@services/dish-data.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { TranslationService } from '@services/translation.service'
import { formatMoney, formatPct1 } from 'src/app/core/engine/rounding'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'

/** The printed table shows this many price movements. */
const TOP_MOVES = 10

interface MoveRow {
  key: string
  name: string
  supplier: string
  min: number
  max: number
  movePct: number
}

/**
 * Plan 634: the printable margin report. Every number comes from `buildMarginReport` (shared with the server) and the
 * stored volatility; the browser only supplies the per-portion cost of each linked dish.
 */
@Component({
  selector: 'app-diag-report',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent],
  templateUrl: './diag-report.component.html',
  styleUrl: './diag-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagReportComponent {
  private readonly dishes_ = inject(DishDataService)
  private readonly recipeCost_ = inject(RecipeCostService)
  private readonly business_ = inject(BusinessService)
  private readonly kitchen_ = inject(KitchenStateService)
  private readonly translation_ = inject(TranslationService)

  readonly diagnosis = input.required<Diagnosis>()
  readonly volatility = input<VolatilityRow[]>([])

  protected readonly formatMoney = formatMoney
  protected readonly formatPct = formatPct1

  /** The cost of ONE portion, only for a linked dish whose cost is complete and above 0. */
  readonly costByDishId = computed<Record<string, number | undefined>>(() => {
    const linked = new Set(
      this.diagnosis()
        .menu.map((row) => row.dishId)
        .filter((id): id is string => !!id)
    )
    const out: Record<string, number | undefined> = {}
    for (const dish of this.dishes_.allDishes_()) {
      if (!linked.has(dish._id)) continue
      const status = this.recipeCost_.computeRecipeCostStatus(dish)
      if (!status.partial && status.cost > 0) out[dish._id] = this.recipeCost_.getRecipeCostPerUnit(dish)
    }
    return out
  })

  protected readonly targetPct_ = computed(
    () => this.business_.business_()?.settings?.profitTargetPct ?? BUSINESS_SETTINGS_DEFAULTS.profitTargetPct
  )

  protected readonly report_ = computed(() => {
    const diagnosis = this.diagnosis()
    return buildMarginReport({
      menu: diagnosis.menu,
      costByDishId: this.costByDishId(),
      volatility: this.volatility(),
      settings: {
        priceRiseAlertPct:
          this.business_.business_()?.settings?.priceRiseAlertPct ?? BUSINESS_SETTINGS_DEFAULTS.priceRiseAlertPct,
        profitTargetPct: this.targetPct_()
      },
      pricesIncludeVat: diagnosis.pricesIncludeVat,
      vatPct: diagnosis.vatPct
    })
  })

  protected readonly noteText_ = computed(() => {
    const diagnosis = this.diagnosis()
    return diagnosis.pricesIncludeVat
      ? this.translation_.translate('diag_vat_note_on').replace('{pct}', String(diagnosis.vatPct))
      : this.translation_.translate('diag_vat_note_off')
  })

  protected readonly targetText_ = computed(() =>
    this.translation_.translate('diag_target_line').replace('{pct}', String(this.targetPct_()))
  )

  protected readonly volatilityTitle_ = computed(() =>
    this.translation_.translate('diag_volatility_title').replace('{days}', String(this.diagnosis().periodDays))
  )

  protected readonly moves_ = computed<MoveRow[]>(() =>
    this.volatility()
      .slice(0, TOP_MOVES)
      .map((row) => ({
        key: `${row.productId}:${row.supplierId}`,
        name: this.productName_(row.productId),
        supplier: this.kitchen_.suppliers_().find((s) => s._id === row.supplierId)?.nameHebrew ?? '',
        min: row.min,
        max: row.max,
        movePct: row.movePct
      }))
  )

  protected readonly findings_ = computed(() =>
    this.report_().findings.map((finding) => ({ key: finding.key, text: this.findingText_(finding) }))
  )

  protected print(): void {
    window.print()
  }

  private productName_(id: string): string {
    return this.kitchen_.products_().find((p) => p._id === id)?.nameHebrew ?? ''
  }

  private findingText_(finding: MarginFinding): string {
    const template = this.translation_.translate(`diag_finding_${finding.key}`)
    if (typeof finding.value === 'number') {
      return template.replace('{value}', String(finding.value)).replace('{evidence}', String(finding.evidenceCount))
    }
    return template
      .replace('{name}', this.productName_(finding.value.productId))
      .replace('{value}', String(finding.value.movePct))
  }
}
