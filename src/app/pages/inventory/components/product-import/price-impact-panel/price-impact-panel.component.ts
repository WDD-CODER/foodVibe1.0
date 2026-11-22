import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { formatMoney, formatPct1 } from 'src/app/core/engine/rounding'

/** Plan 629: one recipe or dish whose cost moved in this save (cost = the engine's total, before and after). */
export interface PriceImpactRow {
  id: string
  name: string
  isDish: boolean
  before: number
  after: number
  changePct: number | null
}

/** The rows shown before the closing "and N more" line. */
const MAX_ROWS = 30

/** Plan 629: what the prices that just went up do to the recipes and dishes. Read-only; shown right under the save summary. */
@Component({
  selector: 'app-price-impact-panel',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './price-impact-panel.component.html',
  styleUrl: './price-impact-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PriceImpactPanelComponent {
  private readonly translation_ = inject(TranslationService)

  readonly rows = input.required<PriceImpactRow[]>()

  protected readonly formatMoney = formatMoney
  protected readonly shown_ = computed(() => this.rows().slice(0, MAX_ROWS))
  protected readonly moreText_ = computed(() => {
    const rest = this.rows().length - MAX_ROWS
    return rest > 0 ? this.translation_.translate('price_impact_more').replace('{count}', String(rest)) : ''
  })

  protected pctText(value: number | null): string {
    if (value === null) return ''
    return (value > 0 ? '+' : '') + formatPct1(value)
  }
}
