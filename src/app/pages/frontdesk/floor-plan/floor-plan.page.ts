import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { FloorMapComponent } from 'src/app/shared/floor-map/floor-map.component'
import { TablePanelComponent } from './components/table-panel/table-panel.component'
import { RoomPanelComponent } from './components/room-panel/room-panel.component'
import {
  duplicateTable,
  overlapping,
  restoreDropped,
  withArea,
  withoutTable,
  withTable,
  type AreaOp,
  type TablePatch
} from './floor-plan-edit.util'
import {
  MAX_TABLES,
  TABLE_PRESETS,
  firstFreeCell,
  newKey,
  nextTableNumber,
  sizeFor,
  type TablePreset
} from 'src/app/shared/floor-map/floor-geometry.util'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { useUnsavedChanges } from '@utils/unsaved-changes'
import { emptyFloorPlan } from '@schemas/front-desk/floor-plan-check'
import type { FloorJoin, FloorPlanBody, FloorTable } from '@models/floor-plan.model'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const DEFAULT_AREA_KEYS = ['fd_opt_inside', 'fd_opt_outside', 'fd_opt_bar']

/** A table the server would not let go, with its joins and the bookings that hold it. */
type InUseRow = { table: FloorTable; joins: FloorJoin[]; count: number }

/** Plan 665: the owner draws the room — adds tables from presets, drags them, saves the whole plan in one request. */
@Component({
  selector: 'app-floor-plan-page',
  standalone: true,
  imports: [
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    LoaderComponent,
    FloorMapComponent,
    TablePanelComponent,
    RoomPanelComponent
  ],
  host: { '(document:keydown.escape)': 'clearSelection()' },
  templateUrl: './floor-plan.page.html',
  styleUrl: './floor-plan.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorPlanPage {
  private readonly floorPlans = inject(FloorPlanDataService)
  private readonly profiles = inject(FrontDeskProfileDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly logging = inject(LoggingService)

  protected readonly presets = TABLE_PRESETS
  protected readonly maxTables = MAX_TABLES

  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly draft_ = signal<FloorPlanBody | null>(null)
  protected readonly selectedKey_ = signal<string | null>(null)
  /** The area chosen in the area row; null = all. It only dims the others and sets the next table's area. */
  protected readonly areaKey_ = signal<string | null>(null)
  /** Plan 684: tables the last save was refused for (409 TABLE_IN_USE); null = no notice. */
  protected readonly inUse_ = signal<InUseRow[] | null>(null)
  /** True right after a duplicate: the copy's number field takes the focus. */
  protected readonly focusNumber_ = signal(false)

  protected readonly canEdit_ = computed(() => this.permission.can('editFrontDesk'))
  protected readonly selectedKeys_ = computed(() => {
    const key = this.selectedKey_()
    return key ? [key] : []
  })
  protected readonly selectedTable_ = computed(() => {
    const key = this.selectedKey_()
    return this.draft_()?.tables.find((t) => t.key === key) ?? null
  })
  protected readonly warnKeys_ = computed(() => {
    const draft = this.draft_()
    return draft ? overlapping(draft) : []
  })
  protected readonly overlapText_ = computed(() => {
    const draft = this.draft_()
    const keys = this.warnKeys_()
    if (!draft || !keys.length) return ''
    const numbers = draft.tables.filter((t) => keys.includes(t.key)).map((t) => t.number)
    return this.translation.translate('fp_overlap_warning').replace('{numbers}', numbers.join(', '))
  })
  protected readonly areas_ = computed(() => [...(this.draft_()?.areas ?? [])].sort((a, b) => a.order - b.order))
  protected readonly tableCount_ = computed(() => this.draft_()?.tables.length ?? 0)
  protected readonly atLimit_ = computed(() => this.tableCount_() >= MAX_TABLES)

  private readonly guardForm_ = new FormGroup({})
  private readonly unsaved_ = useUnsavedChanges({
    form: () => this.guardForm_,
    snapshot: () => JSON.stringify(this.draft_())
  })

  protected readonly canSave_ = computed(() => this.draft_() !== null && !this.isSaving_() && this.dirty_())
  private readonly dirty_ = computed(() => {
    // Reads the draft so the button follows every change.
    this.draft_()
    return this.unsaved_.hasChanges()
  })

  constructor() {
    void this.load()
  }

  /** Route guard (`pendingChangesGuard`): unsaved drawing asks before leaving. */
  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  /** Route guard (`pendingChangesGuard`): "save and leave" — true only when the save succeeded. */
  async saveAndWait(): Promise<boolean> {
    if (!this.canEdit_() || !this.draft_()) return true
    return this.save()
  }

  protected async load(): Promise<void> {
    this.isLoading_.set(true)
    this.loadFailed_.set(false)
    await this.floorPlans.load()
    if (this.floorPlans.loadFailed_()) {
      this.loadFailed_.set(true)
      this.isLoading_.set(false)
      return
    }
    const plan = this.floorPlans.plan_()
    if (plan) {
      this.draft_.set(clone({ grid: plan.grid, areas: plan.areas, tables: plan.tables, joins: plan.joins }))
    } else {
      await this.profiles.ensureLoaded()
      this.draft_.set(emptyFloorPlan(this.startAreaNames(), newKey))
    }
    this.unsaved_.markSaved()
    this.isLoading_.set(false)
  }

  private startAreaNames(): string[] {
    const fromProfile = this.profiles.profile_()?.requestKinds?.table?.rules?.areas ?? []
    if (fromProfile.some((n) => n.trim())) return fromProfile
    return DEFAULT_AREA_KEYS.map((k) => this.translation.translate(k))
  }

  protected selectArea(key: string | null): void {
    this.areaKey_.set(key)
  }

  protected addTable(preset: TablePreset): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_() || this.atLimit_()) return
    const { w, h } = sizeFor(preset.shape, preset.maxSeats)
    const { x, y } = firstFreeCell(draft, { w, h })
    const areaKey = this.areaKey_() ?? this.areas_()[0]?.key
    if (!areaKey) return
    const key = newKey()
    this.draft_.set({
      ...draft,
      tables: [
        ...draft.tables,
        {
          key,
          number: nextTableNumber(draft),
          areaKey,
          shape: preset.shape,
          minSeats: preset.minSeats,
          maxSeats: preset.maxSeats,
          x,
          y,
          w,
          h,
          turned: false,
          active: true,
          online: true
        }
      ]
    })
    this.selectedKey_.set(key)
  }

  protected onTableTapped(key: string): void {
    this.selectedKey_.update((current) => (current === key ? null : key))
  }

  protected clearSelection(): void {
    this.selectedKey_.set(null)
    this.focusNumber_.set(false)
  }

  /** One change of the selected table, applied to the draft at once. */
  protected onTableChange(patch: TablePatch): void {
    const draft = this.draft_()
    const key = this.selectedKey_()
    if (!draft || !key || !this.canEdit_()) return
    const { plan, droppedJoins } = withTable(draft, key, patch)
    this.draft_.set(plan)
    this.focusNumber_.set(false)
    if (droppedJoins.length) {
      this.userMsg.onSetSuccessMsgWithUndo(this.translation.translate('fp_join_dropped'), () =>
        this.draft_.update((d) =>
          d ? { ...d, joins: [...d.joins, ...droppedJoins.filter((j) => !d.joins.some((o) => o.key === j.key))] } : d
        )
      )
    }
  }

  protected onDuplicate(): void {
    const draft = this.draft_()
    const key = this.selectedKey_()
    if (!draft || !key || !this.canEdit_()) return
    const result = duplicateTable(draft, key)
    if (!result) return
    this.draft_.set(result.plan)
    this.selectedKey_.set(result.key)
    this.focusNumber_.set(true)
  }

  protected onRemoveTable(): void {
    const draft = this.draft_()
    const key = this.selectedKey_()
    if (!draft || !key || !this.canEdit_()) return
    const { plan, removed } = withoutTable(draft, key)
    this.draft_.set(plan)
    this.selectedKey_.set(null)
    this.userMsg.onSetSuccessMsgWithUndo(this.translation.translate('fp_table_removed'), () => {
      this.draft_.update((d) => (d ? restoreDropped(d, removed.tables, removed.joins) : d))
      this.selectedKey_.set(removed.tables[0]?.key ?? null)
    })
  }

  protected onAreaOp(op: AreaOp): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_()) return
    const next = withArea(draft, op)
    if (next) this.draft_.set(next)
  }

  protected onGridChange(change: { cols?: number; rows?: number }): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_()) return
    this.draft_.set({ ...draft, grid: { cols: change.cols ?? draft.grid.cols, rows: change.rows ?? draft.grid.rows } })
  }

  /** Puts the tables the server kept (and their joins) back into the draft with their saved values. */
  protected restoreInUse(): void {
    const rows = this.inUse_()
    if (!rows) return
    this.draft_.update((d) =>
      d
        ? restoreDropped(
            d,
            rows.map((r) => r.table),
            rows.flatMap((r) => r.joins)
          )
        : d
    )
    this.inUse_.set(null)
  }

  protected inUseText(row: InUseRow): string {
    return this.translation
      .translate('fp_in_use_row')
      .replace('{number}', row.table.number)
      .replace('{count}', String(row.count))
  }

  /** The tables the saved plan has and the draft dropped, with the number of bookings that hold each. */
  private inUseRows(bookings: { tableKeys: string[] }[]): InUseRow[] {
    const saved = this.floorPlans.plan_()
    const draft = this.draft_()
    if (!saved || !draft) return []
    const rows: InUseRow[] = []
    for (const table of saved.tables) {
      if (draft.tables.some((t) => t.key === table.key)) continue
      const count = bookings.filter((b) => b.tableKeys.includes(table.key)).length
      if (count > 0) rows.push({ table, joins: saved.joins.filter((j) => j.tableKeys.includes(table.key)), count })
    }
    return rows
  }

  protected onTableMoved(move: { key: string; x: number; y: number }): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_()) return
    this.draft_.set({
      ...draft,
      tables: draft.tables.map((t) => (t.key === move.key ? { ...t, x: move.x, y: move.y } : t))
    })
    this.selectedKey_.set(move.key)
  }

  /** One request for the whole plan. On failure the draft stays as it is. */
  protected async save(): Promise<boolean> {
    const draft = this.draft_()
    if (!draft || !this.canEdit_() || this.isSaving_()) return false
    this.isSaving_.set(true)
    try {
      const result = await this.floorPlans.save(clone(draft))
      if (!result.ok) {
        if (result.code === 'TABLE_IN_USE') {
          const rows = this.inUseRows(result.bookings ?? [])
          if (rows.length) {
            this.inUse_.set(rows)
            return false
          }
        }
        this.logging.error({
          event: 'floor_plan.save_refused',
          message: 'Floor plan save refused',
          context: { code: result.code ?? '' }
        })
        this.userMsg.onSetErrorMsg(this.translation.translate('fp_save_failed'))
        return false
      }
      this.inUse_.set(null)
      this.unsaved_.markSaved()
      this.userMsg.onSetSuccessMsg(this.translation.translate('fp_saved'))
      return true
    } finally {
      this.isSaving_.set(false)
    }
  }
}
