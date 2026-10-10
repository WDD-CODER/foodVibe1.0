import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { FormatQuantityPipe } from 'src/app/core/pipes/format-quantity.pipe'

/** One unit choice: the unit key and the row's amount expressed in that unit. */
export interface UnitExpanderOption {
  value: string
  amount: number
}

/**
 * Unit-of-measure tiles for an expanded list row (plan 404, Cook View): each tile shows the unit and
 * the amount converted to it; the current one carries a check. The last tile opens the unit creator.
 * Display-only — the host decides what choosing a unit means.
 */
@Component({
  selector: 'app-unit-expander',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, FormatQuantityPipe],
  templateUrl: './unit-expander.component.html',
  styleUrl: './unit-expander.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnitExpanderComponent {
  // INPUTS
  readonly options = input.required<UnitExpanderOption[]>()
  readonly current = input.required<string>()

  // OUTPUTS
  readonly unitSelect = output<string>()
  readonly addUnit = output<void>()
}
