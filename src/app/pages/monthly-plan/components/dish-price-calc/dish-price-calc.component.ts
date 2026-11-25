import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { dishPrice } from '../../../../core/engine/month-plan'

/** Plan 728: the recommended menu price for a plate cost and the month's food target. The typed cost is never saved. */
@Component({
  selector: 'app-dish-price-calc',
  standalone: true,
  imports: [FormsModule, NumberBoxDirective, TranslatePipe],
  templateUrl: './dish-price-calc.component.html',
  styleUrl: './dish-price-calc.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DishPriceCalcComponent {
  private readonly translation_ = inject(TranslationService)

  readonly foodTargetPct = input.required<number>()
  readonly vatRatePct = input.required<number>()
  readonly dealerType = input.required<'murshe' | 'patur'>()

  protected readonly cost_ = signal<number | null>(null)

  protected readonly price_ = computed(() =>
    dishPrice(this.cost_(), this.foodTargetPct(), this.vatRatePct(), this.dealerType())
  )
  protected readonly netLine_ = computed(() => this.line_('mp_dish_net', 'net', this.price_()?.net))
  protected readonly grossLine_ = computed(() => this.line_('mp_dish_gross', 'gross', this.price_()?.gross))
  protected readonly ruleLine_ = computed(() =>
    this.translation_.translate('mp_dish_rule').replace('{{pct}}', String(this.foodTargetPct()))
  )

  protected setCost(value: number | string | null): void {
    const n = value === null || value === '' ? null : Number(value)
    this.cost_.set(n === null || !Number.isFinite(n) ? null : Math.max(0, n))
  }

  private line_(key: string, token: string, value: number | undefined): string {
    return value === undefined ? '' : this.translation_.translate(key).replace(`{{${token}}}`, value.toFixed(2))
  }
}
