import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { colorOf } from 'src/app/shared/floor-map/floor-zones.util'
import type { FloorPlanBody } from '@models/floor-plan.model'
import { MAX_AREAS, MAX_GRID, minGrid } from '../../floor-plan-edit.util'
import { JoinsListComponent, type JoinPatch } from '../joins-list/joins-list.component'

interface AreaRow {
  key: string
  name: string
  color: number
  count: number
  index: number
  isLast: boolean
}

/**
 * Plan 684, 700: the room card when nothing is selected — the areas (a row opens the zone card), the compact joins and
 * the room size. Inputs in, events out; the page applies them to its draft.
 */
@Component({
  selector: 'app-floor-room-panel',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, CounterComponent, JoinsListComponent],
  templateUrl: './room-panel.component.html',
  styleUrl: './room-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomPanelComponent {
  readonly plan = input.required<FloorPlanBody>()
  /** Plan 666: the join whose tables are marked on the map. */
  readonly markedJoinKey = input<string | null>(null)

  readonly joinPressed = output<string>()
  readonly joinChange = output<{ key: string; patch: JoinPatch }>()
  readonly joinRemoved = output<string>()
  readonly areaSelected = output<string>()
  readonly areaAddRequested = output<void>()
  readonly areaMoved = output<{ key: string; dir: 'up' | 'down' }>()
  readonly gridChange = output<{ cols?: number; rows?: number }>()

  protected readonly maxGrid = MAX_GRID

  protected readonly rows_ = computed<AreaRow[]>(() => {
    const plan = this.plan()
    const sorted = [...plan.areas].sort((a, b) => a.order - b.order)
    return sorted.map((area, index) => ({
      key: area.key,
      name: area.name,
      color: colorOf(area),
      count: plan.tables.filter((t) => t.areaKey === area.key).length,
      index,
      isLast: index === sorted.length - 1
    }))
  })
  protected readonly canAdd_ = computed(() => this.plan().areas.length < MAX_AREAS)
  protected readonly grid_ = computed(() => {
    const plan = this.plan()
    const min = minGrid(plan)
    return { cols: plan.grid.cols, rows: plan.grid.rows, minCols: min.cols, minRows: min.rows }
  })
}
