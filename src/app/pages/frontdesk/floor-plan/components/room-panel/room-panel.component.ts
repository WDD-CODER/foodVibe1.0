import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { newKey } from 'src/app/shared/floor-map/floor-geometry.util'
import type { FloorPlanBody } from '@models/floor-plan.model'
import { areaNameError, MAX_AREAS, MAX_GRID, minGrid, MIN_GRID } from '../../floor-plan-edit.util'
import { JoinsListComponent, type JoinPatch } from '../joins-list/joins-list.component'

interface AreaRow {
  key: string
  name: string
  index: number
  isLast: boolean
  /** False for a new row whose name is not valid yet. */
  inDraft: boolean
  /** The reason the area cannot be removed (dictionary key), or null. */
  blockedKey: string | null
}

/** Plan 684: the panel for the areas and the room size. Inputs in, events out; the page applies them to its draft. */
@Component({
  selector: 'app-floor-room-panel',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, FormFieldComponent, CounterComponent, JoinsListComponent],
  templateUrl: './room-panel.component.html',
  styleUrl: './room-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomPanelComponent {
  private readonly translation = inject(TranslationService)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly plan = input.required<FloorPlanBody>()
  /** Plan 666: the join whose tables are marked on the map. */
  readonly markedJoinKey = input<string | null>(null)

  readonly joinPressed = output<string>()
  readonly joinChange = output<{ key: string; patch: JoinPatch }>()
  readonly joinRemoved = output<string>()
  readonly areaAdded = output<{ key: string; name: string }>()
  readonly areaRenamed = output<{ key: string; name: string }>()
  readonly areaMoved = output<{ key: string; dir: 'up' | 'down' }>()
  readonly areaRemoved = output<string>()
  readonly gridChange = output<{ cols?: number; rows?: number }>()

  protected readonly maxGrid = MAX_GRID

  /** Rows added with "הוספת אזור" that are not in the draft yet (their name is not valid yet). */
  private readonly pending_ = signal<{ key: string; name: string }[]>([])
  /** What was typed in a row, by area key — to show the error while the draft keeps the last valid name. */
  private readonly typed_ = signal<Record<string, string>>({})
  private focusKey: string | null = null

  protected readonly rows_ = computed<AreaRow[]>(() => {
    const plan = this.plan()
    const sorted = [...plan.areas].sort((a, b) => a.order - b.order)
    const inDraft = new Set(sorted.map((a) => a.key))
    const all = [
      ...sorted,
      ...this.pending_()
        .filter((p) => !inDraft.has(p.key))
        .map((p) => ({ ...p, order: 99 }))
    ]
    return all.map((area, index) => ({
      key: area.key,
      name: area.name,
      index,
      isLast: index === all.length - 1,
      inDraft: inDraft.has(area.key),
      blockedKey:
        plan.areas.length <= 1 && inDraft.has(area.key)
          ? 'fp_area_last'
          : plan.tables.some((t) => t.areaKey === area.key)
            ? 'fp_area_has_tables'
            : null
    }))
  })
  protected readonly errors_ = computed<Record<string, string | null>>(() => {
    const plan = this.plan()
    const result: Record<string, string | null> = {}
    for (const [key, text] of Object.entries(this.typed_())) result[key] = areaNameError(plan, key, text)
    return result
  })
  protected readonly canAdd_ = computed(() => this.rows_().length < MAX_AREAS)
  protected readonly grid_ = computed(() => {
    const plan = this.plan()
    const min = minGrid(plan)
    return { cols: plan.grid.cols, rows: plan.grid.rows, minCols: min.cols, minRows: min.rows }
  })
  protected readonly minGridFloor = MIN_GRID

  constructor() {
    effect(() => {
      this.rows_()
      const key = this.focusKey
      if (!key) return
      queueMicrotask(() => {
        const input = this.host.nativeElement.querySelector<HTMLInputElement>(`[data-area-key="${key}"]`)
        if (input) {
          input.focus()
          this.focusKey = null
        }
      })
    })
  }

  protected reasonOf(key: string | null): string {
    return key ? this.translation.translate(key) : ''
  }

  protected addRow(): void {
    if (!this.canAdd_()) return
    const key = newKey()
    this.focusKey = key
    this.pending_.update((rows) => [...rows, { key, name: '' }])
    this.typed_.update((t) => ({ ...t, [key]: '' }))
  }

  protected onNameInput(row: AreaRow, event: Event): void {
    const text = (event.target as HTMLInputElement).value
    this.typed_.update((t) => ({ ...t, [row.key]: text }))
    if (areaNameError(this.plan(), row.key, text) !== null) return
    const inDraft = this.plan().areas.some((a) => a.key === row.key)
    if (inDraft) this.areaRenamed.emit({ key: row.key, name: text.trim() })
    else this.areaAdded.emit({ key: row.key, name: text.trim() })
  }

  protected onNameBlur(row: AreaRow, event: Event): void {
    if (!this.errors_()[row.key]) return
    // A wrong name is shown only while typing; on leaving, an area in the draft shows its kept name.
    if (this.plan().areas.some((a) => a.key === row.key)) {
      ;(event.target as HTMLInputElement).value = row.name
      this.typed_.update(({ [row.key]: _gone, ...rest }) => rest)
    }
  }

  protected remove(row: AreaRow): void {
    if (row.blockedKey) return
    if (!this.plan().areas.some((a) => a.key === row.key)) {
      this.pending_.update((rows) => rows.filter((r) => r.key !== row.key))
      return
    }
    this.areaRemoved.emit(row.key)
  }
}
