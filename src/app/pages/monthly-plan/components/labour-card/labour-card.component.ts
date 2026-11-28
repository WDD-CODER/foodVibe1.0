import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LABOUR_FACTOR_DEFAULT, type LabourGroup } from '@schemas/month/month-rules'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { formatMoney, roundMoney } from '../../../../core/engine/rounding'
import { MonthPairComponent } from '../month-pair/month-pair.component'

type Side = 'plan' | 'actual'

/**
 * Plan 729 / 749: the team's cost as ONE total. The owner types gross pay; the employer cost (gross × factor) is
 * always shown beside it as an estimate (N-M1). Controlled: the page owns the group.
 */
@Component({
  selector: 'app-labour-card',
  standalone: true,
  imports: [FormsModule, NumberBoxDirective, TranslatePipe, MonthPairComponent],
  templateUrl: './labour-card.component.html',
  styleUrl: './labour-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabourCardComponent {
  private readonly translation_ = inject(TranslationService)

  readonly group = input.required<LabourGroup>()
  readonly disabled = input(false)
  readonly groupChange = output<LabourGroup>()

  protected readonly employerCosts_ = computed(() => {
    const g = this.group()
    return (['plan', 'actual'] as const).map((side) => {
      const gross = g[side]
      const amount =
        gross === null ? this.translation_.translate('mp_not_entered') : formatMoney(roundMoney(gross * g.factor))
      return {
        side,
        sideKey: side === 'plan' ? 'mp_chip_plan' : 'mp_actual',
        text: this.translation_.translate('mp_labour_employer_cost').replace('{{amount}}', amount)
      }
    })
  })

  protected setAmount(side: Side, value: number | null): void {
    this.groupChange.emit({ ...this.group(), [side]: value === null ? null : Math.max(0, value) })
  }

  /** One factor for plan and actual, kept inside 1–2; an empty box falls back to the default. */
  protected setFactor(value: number | string | null): void {
    const n = value === null || value === '' ? LABOUR_FACTOR_DEFAULT : Number(value)
    if (!Number.isFinite(n)) return
    this.groupChange.emit({ ...this.group(), factor: Math.min(2, Math.max(1, n)) })
  }
}
