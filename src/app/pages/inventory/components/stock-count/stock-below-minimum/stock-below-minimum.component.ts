import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { TranslationService } from '@services/translation.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { formatQty } from 'src/app/core/engine/rounding'
import type { BelowMinimumRow } from 'src/app/core/utils/stock-count.util'

/** Plan 636: the products whose counted stock is under their minimum. Read-only; no row action. */
@Component({
  selector: 'app-stock-below-minimum',
  standalone: true,
  imports: [DatePipe, TranslatePipe, EmptyStateComponent],
  templateUrl: './stock-below-minimum.component.html',
  styleUrl: './stock-below-minimum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockBelowMinimumComponent {
  readonly rows = input.required<BelowMinimumRow[]>()
  readonly uncounted = input<number>(0)
  /** True once at least one final count exists (an on-hand row is there), so "nothing below" can be told apart from "no count". */
  readonly hasFinalCount = input<boolean>(true)

  private readonly translation_ = inject(TranslationService)
  protected readonly uncountedNote_ = computed(() =>
    this.translation_.translate('stk_uncounted_note').replace('{n}', String(this.uncounted()))
  )

  protected shown(qty: number, unit: string): string {
    const f = formatQty(qty, unit)
    return `${f.qty} ${f.unit}`
  }
}
