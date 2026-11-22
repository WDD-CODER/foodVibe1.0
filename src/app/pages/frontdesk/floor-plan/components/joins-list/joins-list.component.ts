import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import type { FloorJoin, FloorPlanBody } from '@models/floor-plan.model'
import { joinLabel } from '../../floor-plan-joins.util'

export type JoinPatch = Partial<Pick<FloorJoin, 'minSeats' | 'maxSeats' | 'online'>>

interface JoinRow {
  join: FloorJoin
  label: string
  marked: boolean
}

const MAX_JOIN_SEATS = 30

/** Plan 666: the joins of the room — one row each with seats, the online switch and remove. Inputs in, events out. */
@Component({
  selector: 'app-floor-joins-list',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, CounterComponent],
  templateUrl: './joins-list.component.html',
  styleUrl: './joins-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JoinsListComponent {
  readonly plan = input.required<FloorPlanBody>()
  /** The join whose tables are marked on the map. */
  readonly markedKey = input<string | null>(null)

  readonly joinPressed = output<string>()
  readonly joinChange = output<{ key: string; patch: JoinPatch }>()
  readonly joinRemoved = output<string>()

  protected readonly maxSeats = MAX_JOIN_SEATS

  protected readonly rows_ = computed<JoinRow[]>(() => {
    const plan = this.plan()
    const marked = this.markedKey()
    return plan.joins.map((join) => ({ join, label: joinLabel(plan, join), marked: join.key === marked }))
  })

  protected setOnline(key: string, event: Event): void {
    this.joinChange.emit({ key, patch: { online: (event.target as HTMLInputElement).checked } })
  }
}
