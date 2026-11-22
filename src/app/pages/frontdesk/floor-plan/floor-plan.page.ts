import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { FloorMapComponent } from 'src/app/shared/floor-map/floor-map.component'
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
import type { FloorPlanBody } from '@models/floor-plan.model'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const DEFAULT_AREA_KEYS = ['fd_opt_inside', 'fd_opt_outside', 'fd_opt_bar']

/** Plan 665: the owner draws the room — adds tables from presets, drags them, saves the whole plan in one request. */
@Component({
  selector: 'app-floor-plan-page',
  standalone: true,
  imports: [TranslatePipe, PageHeaderComponent, EmptyStateComponent, LoaderComponent, FloorMapComponent],
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

  protected readonly canEdit_ = computed(() => this.permission.can('editFrontDesk'))
  protected readonly selectedKeys_ = computed(() => {
    const key = this.selectedKey_()
    return key ? [key] : []
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
        this.logging.error({
          event: 'floor_plan.save_refused',
          message: 'Floor plan save refused',
          context: { code: result.code ?? '' }
        })
        this.userMsg.onSetErrorMsg(this.translation.translate('fp_save_failed'))
        return false
      }
      this.unsaved_.markSaved()
      this.userMsg.onSetSuccessMsg(this.translation.translate('fp_saved'))
      return true
    } finally {
      this.isSaving_.set(false)
    }
  }
}
