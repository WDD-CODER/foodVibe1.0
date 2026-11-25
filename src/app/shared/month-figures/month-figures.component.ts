import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import type { MonthTargetKey } from '@schemas/month/month-rules'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import {
  bandOf,
  type MissingKey,
  type MonthColumn,
  type MonthFigures,
  type MonthTargets
} from '../../core/engine/month-plan'
import { formatMoney, formatPct1 } from '../../core/engine/rounding'

type MoneyKey = 'revenue' | 'foodCost' | 'labour' | 'primeCost' | 'fixed' | 'profit' | 'breakEven' | 'roomForTeam'
type PctKey = 'foodPct' | 'labourPct' | 'primePct' | 'fixedPct' | 'profitPct'

interface RowDef {
  key: MoneyKey
  labelKey: string
  ruleKey?: string
  /** An input the owner types (its blank is «לא הוזן»); the others are figures worked out from them. */
  isInput: boolean
  pct?: PctKey
  target?: MonthTargetKey
  /** The food row's plan value may come from the target. */
  food?: boolean
}

export interface FigureCell {
  text: string
  pctText: string | null
  partial: boolean
  fromTarget: boolean
  negative: boolean
  band: 'in' | 'out' | null
}
export interface FigureRow {
  key: MoneyKey
  labelKey: string
  ruleKey: string | null
  plan: FigureCell
  actual: FigureCell
}

const ROWS: readonly RowDef[] = [
  { key: 'revenue', labelKey: 'mp_row_revenue', isInput: true },
  { key: 'foodCost', labelKey: 'mp_row_food', isInput: true, pct: 'foodPct', target: 'foodPct', food: true },
  { key: 'labour', labelKey: 'mp_row_labour', isInput: true, pct: 'labourPct', target: 'labourPct' },
  { key: 'primeCost', labelKey: 'mp_row_prime', isInput: false, pct: 'primePct', target: 'primePct' },
  { key: 'fixed', labelKey: 'mp_row_fixed', isInput: true, pct: 'fixedPct', target: 'fixedPct' },
  { key: 'profit', labelKey: 'mp_row_profit', isInput: false, pct: 'profitPct', target: 'profitPct' },
  { key: 'breakEven', labelKey: 'mp_row_break_even', ruleKey: 'mp_break_even_rule', isInput: false },
  { key: 'roomForTeam', labelKey: 'mp_row_room_for_team', ruleKey: 'mp_room_rule', isInput: false }
]

const MISSING_LABEL: Record<MissingKey, string> = {
  revenue: 'mp_missing_revenue',
  foodCost: 'mp_missing_food',
  labour: 'mp_missing_labour',
  fixed: 'mp_missing_fixed'
}

/** Plan 728: the month's plan and actual figures side by side, with what is missing marked (N-M2). Presentation only. */
@Component({
  selector: 'app-month-figures',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './month-figures.component.html',
  styleUrl: './month-figures.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthFiguresComponent {
  private readonly translation_ = inject(TranslationService)

  readonly figures = input.required<MonthFigures>()
  readonly targets = input.required<MonthTargets>()

  protected readonly badge_ = computed(() => {
    const { entered, of } = this.figures().completeness
    return this.translation_
      .translate('mp_completeness')
      .replace('{{entered}}', String(entered))
      .replace('{{of}}', String(of))
  })
  protected readonly missingLine_ = computed(() => {
    const missing = this.figures().missing
    if (missing.length === 0) return ''
    const list = missing.map((k) => this.translation_.translate(MISSING_LABEL[k])).join(', ')
    return this.translation_.translate('mp_missing').replace('{{list}}', list)
  })
  protected readonly rows_ = computed<FigureRow[]>(() => {
    const f = this.figures()
    return ROWS.map((def) => ({
      key: def.key,
      labelKey: def.labelKey,
      ruleKey: def.ruleKey ?? null,
      plan: this.cell_(def, f.plan, false),
      actual: this.cell_(def, f.actual, true)
    }))
  })

  private cell_(def: RowDef, col: MonthColumn, isActual: boolean): FigureCell {
    const value = col[def.key]
    const pct = def.pct ? col[def.pct] : null
    const band = isActual && def.target ? bandOf(def.target, pct) : null
    const missingText = def.isInput || col.partial ? 'mp_not_entered' : null
    return {
      text: value === null ? (missingText ? this.translation_.translate(missingText) : '—') : formatMoney(value),
      pctText: def.pct ? (pct === null ? '—' : formatPct1(pct)) : null,
      partial: value !== null && !def.isInput && col.partial,
      fromTarget: !!def.food && col.fromTarget && value !== null,
      negative: (def.key === 'profit' || def.key === 'roomForTeam') && value !== null && value < 0,
      band: band === null ? null : band === 'in' ? 'in' : 'out'
    }
  }
}
