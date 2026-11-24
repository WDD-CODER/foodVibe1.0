import { Directionality } from '@angular/cdk/bidi'
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { FormGroup } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { FloorMapComponent, type FloorZoneEvent } from 'src/app/shared/floor-map/floor-map.component'
import { colorOf, type ZoneRect } from 'src/app/shared/floor-map/floor-zones.util'
import { TipDirective } from 'src/app/shared/tip/tip.directive'
import { TablePanelComponent } from './components/table-panel/table-panel.component'
import { RoomPanelComponent } from './components/room-panel/room-panel.component'
import { ZonePanelComponent } from './components/zone-panel/zone-panel.component'
import { joinProblem, newJoin, withJoin, withJoinChange, withoutJoin } from './floor-plan-joins.util'
import {
  duplicateTable,
  MAX_AREAS,
  newAreaName,
  overlapping,
  restoreDropped,
  withArea,
  withoutTable,
  withTable,
  withTableDropped,
  withZone,
  type AreaOp,
  type TablePatch
} from './floor-plan-edit.util'
import {
  MAX_TABLES,
  TABLE_PRESETS,
  firstFreeCell,
  footprintFor,
  newKey,
  nextTableNumber,
  sizeFor,
  stepCell,
  type StepArrow,
  type TablePreset
} from 'src/app/shared/floor-map/floor-geometry.util'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { PHONE_QUERY } from '@utils/breakpoints'
import { useUnsavedChanges } from '@utils/unsaved-changes'
import { emptyFloorPlan } from '@schemas/front-desk/floor-plan-check'
import type { FloorJoin, FloorPlanBody, FloorTable } from '@models/floor-plan.model'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
/** Plan 700: the three tools of the toolbar. */
type Tool = 'select' | 'zone' | 'join'
const TOOL_KEYS: Record<string, Tool> = { v: 'select', z: 'zone', j: 'join' }
const DEFAULT_AREA_KEYS = ['fd_opt_inside', 'fd_opt_outside', 'fd_opt_bar']

/** A table the server would not let go, with its joins and the bookings that hold it. */
type InUseRow = { table: FloorTable; joins: FloorJoin[]; count: number }
/** Plan 666: a join the server would not let go while all its tables stay in the draft. */
type InUseJoin = { join: FloorJoin; count: number }

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
    RoomPanelComponent,
    ZonePanelComponent,
    TipDirective,
    LucideAngularModule
  ],
  host: { '(document:keydown.escape)': 'onEscape()', '(document:keydown)': 'onKey($event)' },
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
  private readonly directionality = inject(Directionality)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panel')

  protected readonly presets = TABLE_PRESETS
  protected readonly maxTables = MAX_TABLES
  protected readonly maxAreas = MAX_AREAS
  protected readonly colorOfArea = colorOf

  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly draft_ = signal<FloorPlanBody | null>(null)
  protected readonly selectedKey_ = signal<string | null>(null)
  /** Plan 700: the tool in use — select (drag, resize), zone (draw an area's shape) or join (pick tables). */
  protected readonly tool_ = signal<Tool>('select')
  /** Plan 700: the selected zone (an area key); null = none. */
  protected readonly zoneKey_ = signal<string | null>(null)
  /** True right after "add area": the zone card's name field takes the focus. */
  protected readonly focusZoneName_ = signal(false)
  /** Plan 684: tables the last save was refused for (409 TABLE_IN_USE); null = no notice. */
  protected readonly inUse_ = signal<InUseRow[] | null>(null)
  /** Plan 666: the joins the last save was refused for; shown with the rows of `inUse_`. */
  protected readonly inUseJoins_ = signal<InUseJoin[]>([])
  /** Plan 666, 700: the join tool — a tap picks a table for a join and no table panel opens. */
  protected readonly multi_ = computed(() => this.tool_() === 'join')
  protected readonly picked_ = signal<string[]>([])
  /** The join whose row was pressed; its tables look selected on the map. */
  protected readonly joinMarkKey_ = signal<string | null>(null)
  /** Phone only: the room panel (areas, size, joins) is open in the sheet. */
  protected readonly roomOpen_ = signal(false)
  /** True right after a duplicate: the copy's number field takes the focus. */
  protected readonly focusNumber_ = signal(false)

  protected readonly canEdit_ = computed(() => this.permission.can('editFrontDesk'))
  protected readonly selectedKeys_ = computed(() => {
    if (this.multi_()) return this.picked_()
    const mark = this.joinMarkKey_()
    if (mark) return this.draft_()?.joins.find((j) => j.key === mark)?.tableKeys ?? []
    const key = this.selectedKey_()
    return key ? [key] : []
  })
  /** Why the picked tables cannot be joined (a dictionary key); '' when they can. */
  protected readonly joinReason_ = computed<string>(() => {
    const draft = this.draft_()
    const picked = this.picked_()
    if (!draft || !picked.length) return 'fp_join_pick'
    return joinProblem(draft, picked) ?? ''
  })
  /** The area the zone tool draws: the selected zone, else the first area without a shape, else the first area. */
  protected readonly drawZoneKey_ = computed<string | null>(() => {
    if (this.tool_() !== 'zone') return null
    const areas = this.areas_()
    const chosen = this.zoneKey_()
    if (chosen && areas.some((a) => a.key === chosen)) return chosen
    return (areas.find((a) => !a.zone) ?? areas[0])?.key ?? null
  })
  /** The area whose card the inspector shows: the selected zone or the one the zone tool draws. */
  protected readonly inspectZoneKey_ = computed<string | null>(() => {
    if (this.selectedTable_()) return null
    const key = this.zoneKey_() ?? this.drawZoneKey_()
    return key && this.areas_().some((a) => a.key === key) ? key : null
  })
  protected readonly inspectZone_ = computed(() => {
    const key = this.inspectZoneKey_()
    return this.areas_().find((a) => a.key === key) ?? null
  })
  protected readonly sheetOpen_ = computed(
    () => this.selectedTable_() !== null || this.inspectZoneKey_() !== null || this.roomOpen_()
  )
  /** The area the next added table goes to. */
  private readonly areaKey_ = computed(() => this.zoneKey_() ?? this.areas_()[0]?.key ?? null)
  protected readonly legend_ = computed(() => {
    const draft = this.draft_()
    return this.areas_().map((area) => ({
      area,
      color: colorOf(area),
      count: draft?.tables.filter((t) => t.areaKey === area.key).length ?? 0
    }))
  })
  protected readonly statusText_ = computed(() => {
    const draft = this.draft_()
    if (!draft) return ''
    return this.translation
      .translate('fp_status')
      .replace('{tables}', String(draft.tables.length))
      .replace('{areas}', String(draft.areas.length))
      .replace('{joins}', String(draft.joins.length))
      .replace('{cols}', String(draft.grid.cols))
      .replace('{rows}', String(draft.grid.rows))
  })
  protected readonly selectedTable_ = computed(() => {
    const key = this.selectedKey_()
    return this.draft_()?.tables.find((t) => t.key === key) ?? null
  })
  /** Plan 699: every table that is part of a join, marked on the map. */
  protected readonly joinedKeys_ = computed(() => [
    ...new Set((this.draft_()?.joins ?? []).flatMap((j) => j.tableKeys))
  ])
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
  protected readonly dirty_ = computed(() => {
    // Reads the draft so the button follows every change.
    this.draft_()
    return this.unsaved_.hasChanges()
  })

  constructor() {
    void this.load()
    // The selected table is kept in view above the sheet.
    effect(() => {
      const key = this.selectedKey_()
      if (!key) return
      queueMicrotask(() => {
        const table = this.host.nativeElement.querySelector<HTMLElement>(`[data-key="${key}"]`)
        table?.scrollIntoView?.({ block: 'nearest' })
      })
    })
    // Plan 721: on a phone the panel opens in the page under the map; scroll it into view (runs last).
    effect(() => {
      const open = this.sheetOpen_()
      const opened = open && !this.wasOpen_
      this.wasOpen_ = open
      if (!opened || !this.isPhone_()) return
      queueMicrotask(() => this.panelEl()?.nativeElement.scrollIntoView?.({ block: 'nearest' }))
    })
  }

  private wasOpen_ = false

  private isPhone_(): boolean {
    try {
      return window.matchMedia(PHONE_QUERY).matches
    } catch {
      return false
    }
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

  /** Plan 700: a legend chip, a zone on the map or a row of the room card selects that zone. */
  protected selectZone(key: string): void {
    if (!this.canEdit_()) return
    if (this.tool_() === 'join') this.setTool('select')
    this.zoneKey_.set(key)
    this.selectedKey_.set(null)
    this.joinMarkKey_.set(null)
    this.focusZoneName_.set(false)
  }

  /** Plan 700: switches the tool. Leaving the join tool forgets the picked tables. */
  protected setTool(tool: Tool): void {
    if (!this.canEdit_() || this.tool_() === tool) return
    this.tool_.set(tool)
    this.picked_.set([])
    this.joinMarkKey_.set(null)
    if (tool !== 'select') this.selectedKey_.set(null)
    if (tool === 'join') this.zoneKey_.set(null)
    this.focusZoneName_.set(false)
  }

  /** A press on a tool button: a second press on the zone or join tool goes back to select. */
  protected pressTool(tool: Tool): void {
    this.setTool(this.tool_() === tool && tool !== 'select' ? 'select' : tool)
  }

  protected onEscape(): void {
    if (this.tool_() !== 'select') {
      this.setTool('select')
      return
    }
    this.clearSelection()
  }

  /** Plan 700: v / z / j switch the tool; ignored while typing and with a modifier held. */
  protected onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
    const target = event.target as HTMLElement | null
    const tag = target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
    const tool = TOOL_KEYS[event.key.toLowerCase()]
    if (tool) this.setTool(tool)
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
    if (this.multi_()) {
      this.picked_.update((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]))
      return
    }
    if (this.tool_() === 'zone') return
    this.joinMarkKey_.set(null)
    this.roomOpen_.set(false)
    this.zoneKey_.set(null)
    this.selectedKey_.update((current) => (current === key ? null : key))
  }

  protected clearSelection(): void {
    this.selectedKey_.set(null)
    this.zoneKey_.set(null)
    this.picked_.set([])
    this.joinMarkKey_.set(null)
    this.focusNumber_.set(false)
  }

  /** The sheet's X (phone): closes the table panel or the room panel. */
  protected closeSheet(): void {
    this.clearSelection()
    this.roomOpen_.set(false)
  }

  protected addJoin(): void {
    const draft = this.draft_()
    const picked = this.picked_()
    if (!draft || !this.canEdit_() || joinProblem(draft, picked) !== null) return
    this.draft_.set(withJoin(draft, newJoin(draft, picked, newKey())))
    this.tool_.set('select')
    this.picked_.set([])
  }

  protected onJoinPressed(key: string): void {
    this.joinMarkKey_.update((current) => (current === key ? null : key))
  }

  protected onJoinChange(change: {
    key: string
    patch: Partial<Pick<FloorJoin, 'minSeats' | 'maxSeats' | 'online'>>
  }): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_()) return
    this.draft_.set(withJoinChange(draft, change.key, change.patch))
  }

  protected onJoinRemoved(key: string): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_()) return
    const { plan, removed } = withoutJoin(draft, key)
    if (!removed) return
    this.draft_.set(plan)
    if (this.joinMarkKey_() === key) this.joinMarkKey_.set(null)
    this.userMsg.onSetSuccessMsgWithUndo(this.translation.translate('fp_join_removed'), () =>
      this.draft_.update((d) => (d && !d.joins.some((j) => j.key === removed.key) ? withJoin(d, removed) : d))
    )
  }

  /** One cell step of the selected table, in the direction the arrow points on the screen. */
  protected onMove(arrow: StepArrow): void {
    const draft = this.draft_()
    const table = draft?.tables.find((t) => t.key === this.selectedKey_())
    if (!draft || !table || !this.canEdit_()) return
    const to = stepCell(
      { x: table.x, y: table.y },
      footprintFor(table),
      arrow,
      this.directionality.value === 'ltr' ? 'ltr' : 'rtl',
      draft.grid
    )
    if (to.x === table.x && to.y === table.y) return
    this.draft_.set({ ...draft, tables: draft.tables.map((t) => (t.key === table.key ? { ...t, ...to } : t)) })
  }

  /** One change of the selected table, applied to the draft at once. */
  protected onTableChange(patch: TablePatch): void {
    const draft = this.draft_()
    const key = this.selectedKey_()
    if (!draft || !key || !this.canEdit_()) return
    const { plan, droppedJoins } = withTable(draft, key, patch)
    this.draft_.set(plan)
    this.focusNumber_.set(false)
    this.offerJoinsBack(droppedJoins)
  }

  /** Joins dropped by an area change: one message with an undo that puts them back. */
  private offerJoinsBack(droppedJoins: FloorJoin[]): void {
    if (!droppedJoins.length) return
    this.userMsg.onSetSuccessMsgWithUndo(this.translation.translate('fp_join_dropped'), () =>
      this.draft_.update((d) =>
        d ? { ...d, joins: [...d.joins, ...droppedJoins.filter((j) => !d.joins.some((o) => o.key === j.key))] } : d
      )
    )
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

  /** Plan 700: "הוספת אזור" adds "אזור חדש" with the next free colour, selects it and focuses its name field. */
  protected onAreaAdd(): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_()) return
    const key = newKey()
    const next = withArea(draft, {
      type: 'add',
      key,
      name: newAreaName(draft, this.translation.translate('fp_area_new'))
    })
    if (!next) return
    this.draft_.set(next)
    this.tool_.set('select')
    this.picked_.set([])
    this.selectedKey_.set(null)
    this.joinMarkKey_.set(null)
    this.zoneKey_.set(key)
    this.focusZoneName_.set(true)
  }

  /** Plan 700: the zone card's "הסרת האזור" — an empty area goes, the message's undo brings it back with its shape. */
  protected onAreaRemove(key: string): void {
    const draft = this.draft_()
    const area = draft?.areas.find((a) => a.key === key)
    if (!draft || !area || !this.canEdit_()) return
    const next = withArea(draft, { type: 'remove', key })
    if (!next) return
    this.draft_.set(next)
    if (this.zoneKey_() === key) this.zoneKey_.set(null)
    if (this.tool_() === 'zone') this.tool_.set('select')
    this.userMsg.onSetSuccessMsgWithUndo(this.translation.translate('fp_area_removed'), () => {
      this.draft_.update((d) => (d && !d.areas.some((a) => a.key === key) ? { ...d, areas: [...d.areas, area] } : d))
      this.zoneKey_.set(key)
    })
  }

  /** Plan 700: a zone shape set or cleared through `withZone`; a refusal shows its message and changes nothing. */
  private applyZone(areaKey: string, rect: ZoneRect | null): boolean {
    const draft = this.draft_()
    const before = draft?.areas.find((a) => a.key === areaKey)
    if (!draft || !before || !this.canEdit_()) return false
    const result = withZone(draft, areaKey, rect)
    if ('refused' in result) {
      this.userMsg.onSetErrorMsg(this.translation.translate(result.refused))
      return false
    }
    this.draft_.set(result.plan)
    const previousZone = before.zone
    const previousTables = draft.tables.filter((t) => result.movedKeys.includes(t.key))
    const putBack = (): void =>
      this.draft_.update((d) => {
        if (!d) return d
        const areas = d.areas.map((a) => {
          if (a.key !== areaKey) return a
          const { zone: _gone, ...rest } = a
          return previousZone ? { ...rest, zone: previousZone } : rest
        })
        const tables = d.tables.map((t) => previousTables.find((p) => p.key === t.key) ?? t)
        const joins = [...d.joins, ...result.droppedJoins.filter((j) => !d.joins.some((o) => o.key === j.key))]
        return { ...d, areas, tables, joins }
      })
    if (result.movedKeys.length) {
      this.userMsg.onSetSuccessMsgWithUndo(
        this.translation
          .translate('fp_zone_tables_moved')
          .replace('{count}', String(result.movedKeys.length))
          .replace('{name}', before.name),
        putBack
      )
    } else if (rect === null && previousZone) {
      this.userMsg.onSetSuccessMsgWithUndo(this.translation.translate('fp_zone_cleared'), putBack)
    }
    return true
  }

  /** The map drew a zone: on success back to the select tool with that zone selected; refused → the tool stays. */
  protected onZoneDrawn(event: FloorZoneEvent): void {
    if (!this.applyZone(event.areaKey, event.rect)) return
    this.tool_.set('select')
    this.zoneKey_.set(event.areaKey)
    this.selectedKey_.set(null)
  }

  protected onZoneChanged(event: FloorZoneEvent): void {
    this.applyZone(event.areaKey, event.rect)
  }

  protected onZoneCleared(key: string): void {
    this.applyZone(key, null)
  }

  /** The zone card's "סימון על המפה" / "סימון מחדש": the zone tool draws that area. */
  protected onDrawRequested(key: string): void {
    if (!this.canEdit_()) return
    this.setTool('zone')
    this.zoneKey_.set(key)
  }

  protected onGridChange(change: { cols?: number; rows?: number }): void {
    const draft = this.draft_()
    if (!draft || !this.canEdit_()) return
    this.draft_.set({ ...draft, grid: { cols: change.cols ?? draft.grid.cols, rows: change.rows ?? draft.grid.rows } })
  }

  /** Puts the tables the server kept (and their joins) back into the draft with their saved values. */
  protected restoreInUse(): void {
    const rows = this.inUse_() ?? []
    const joins = this.inUseJoins_()
    if (!rows.length && !joins.length) return
    this.draft_.update((d) =>
      d
        ? restoreDropped(
            d,
            rows.map((r) => r.table),
            [...rows.flatMap((r) => r.joins), ...joins.map((j) => j.join)]
          )
        : d
    )
    this.inUse_.set(null)
    this.inUseJoins_.set([])
  }

  protected inUseJoinText(row: InUseJoin): string {
    const draft = this.draft_()
    const numbers = (draft?.tables ?? [])
      .filter((t) => row.join.tableKeys.includes(t.key))
      .map((t) => t.number)
      .join(' + ')
    return this.translation
      .translate('fp_in_use_join')
      .replace('{numbers}', numbers)
      .replace('{count}', String(row.count))
  }

  /** Saved joins the draft dropped while all their tables stay (the table rows cover the others). */
  private inUseJoinRows(bookings: { tableKeys: string[] }[]): InUseJoin[] {
    const saved = this.floorPlans.plan_()
    const draft = this.draft_()
    if (!saved || !draft) return []
    const rows: InUseJoin[] = []
    for (const join of saved.joins) {
      if (draft.joins.some((j) => j.key === join.key)) continue
      if (!join.tableKeys.every((k) => draft.tables.some((t) => t.key === k))) continue
      const count = bookings.filter((b) => join.tableKeys.every((k) => b.tableKeys.includes(k))).length
      if (count > 0) rows.push({ join, count })
    }
    return rows
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
    // Plan 699: a table dropped into another area's zone joins that area.
    const { plan, droppedJoins } = withTableDropped(draft, move.key, move.x, move.y)
    this.draft_.set(plan)
    this.selectedKey_.set(move.key)
    this.offerJoinsBack(droppedJoins)
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
          const joinRows = this.inUseJoinRows(result.bookings ?? [])
          if (rows.length || joinRows.length) {
            this.inUse_.set(rows)
            this.inUseJoins_.set(joinRows)
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
      this.inUseJoins_.set([])
      this.unsaved_.markSaved()
      this.userMsg.onSetSuccessMsg(this.translation.translate('fp_saved'))
      return true
    } finally {
      this.isSaving_.set(false)
    }
  }
}
