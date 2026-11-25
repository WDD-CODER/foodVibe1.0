import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LABOUR_FACTOR_DEFAULT, type LabourGroup } from '@schemas/month/month-rules'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { roundMoney } from '../../../../core/engine/rounding'

type Side = 'plan' | 'actual'

/** Plan 729: the team's cost as ONE total: employer cost, or gross pay × a factor shown as an estimate (N-M1). */
@Component({
  selector: 'app-labour-card',
  standalone: true,
  imports: [FormsModule, NumberBoxDirective, TranslatePipe],
  templateUrl: './labour-card.component.html',
  styleUrl: './labour-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabourCardComponent {
  private readonly translation_ = inject(TranslationService)

  readonly group = input.required<LabourGroup>()
  readonly disabled = input(false)
  readonly groupChange = output<LabourGroup>()

  protected readonly sides: readonly { key: Side; labelKey: string }[] = [
    { key: 'plan', labelKey: 'mp_plan' },
    { key: 'actual', labelKey: 'mp_actual' }
  ]
  protected readonly estimates_ = computed(() => {
    const g = this.group()
    const line = (value: number | null): string | null =>
      value === null
        ? null
        : this.translation_
            .translate('mp_labour_estimate')
            .replace('{{amount}}', roundMoney(value * g.factor).toLocaleString('en-US', { maximumFractionDigits: 2 }))
    return { plan: line(g.plan), actual: line(g.actual) }
  })

  protected setMode(mode: LabourGroup['mode']): void {
    if (this.disabled() || mode === this.group().mode) return
    this.groupChange.emit({ ...this.group(), mode })
  }

  protected setAmount(side: Side, value: number | string | null): void {
    this.groupChange.emit({ ...this.group(), [side]: this.num_(value) })
  }

  /** One factor for plan and actual, kept inside 1–2; an empty box falls back to the default. */
  protected setFactor(value: number | string | null): void {
    const n = value === null || value === '' ? LABOUR_FACTOR_DEFAULT : Number(value)
    if (!Number.isFinite(n)) return
    this.groupChange.emit({ ...this.group(), factor: Math.min(2, Math.max(1, n)) })
  }

  private num_(value: number | string | null): number | null {
    if (value === null || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(0, n) : null
  }
}
