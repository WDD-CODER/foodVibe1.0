import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { prepSheetMetaLine } from 'src/app/core/utils/prep-sheet-groups.util'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { buildLoadingList, type LoadingRow } from '@schemas/logistics/loading-list'
import { EquipmentDataService } from '@services/equipment-data.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { LogisticsItemRegistryService } from '@services/logistics-item-registry.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { TranslationService } from '@services/translation.service'

const BODY_CLASS = 'loading-list-open'

interface LoadingGroup {
  key: string
  title: string
  equipment: boolean
  rows: LoadingRow[]
}

/**
 * Plan 624 (C-LOAD): the loading list of one stored event as a popup sheet. Rows come from `buildLoadingList`
 * a tick is saved at once through `EventPipelineService.saveLoading`, so everyone loading sees the same state.
 */
@Component({
  selector: 'app-loading-list',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    EmptyStateComponent,
    ModalShellComponent,
    DisabledWhyDirective
  ],
  templateUrl: './loading-list.component.html',
  styleUrl: './loading-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' }
})
export class LoadingListComponent {
  // 1. INJECTED
  private readonly eventData_ = inject(MenuEventDataService)
  private readonly equipment_ = inject(EquipmentDataService)
  private readonly pipeline_ = inject(EventPipelineService)
  private readonly registry_ = inject(LogisticsItemRegistryService)
  private readonly translation_ = inject(TranslationService)
  private readonly document_ = inject(DOCUMENT)
  private readonly destroyRef_ = inject(DestroyRef)

  // 2. INPUTS
  readonly eventId = input.required<string>()

  // 3. OUTPUTS
  readonly close = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly equipmentReady_ = signal(false)
  protected readonly pendingKeys_ = signal<ReadonlySet<string>>(new Set())
  protected readonly t_ = (key: string): string => this.translation_.translate(key)

  // 5. COMPUTED
  protected readonly event_ = computed(
    () => this.eventData_.allMenuEvents_().find((e) => e._id === this.eventId()) ?? null
  )
  protected readonly finished_ = computed(() => this.event_()?.stage === 'finished')
  protected readonly metaLine_ = computed(() => {
    const event = this.event_()
    return event ? prepSheetMetaLine(event, this.t_) : ''
  })

  protected readonly rows_ = computed<LoadingRow[]>(() => {
    const event = this.event_()
    if (!event) return []
    const hidden = new Set(event.siteLogistics?.hiddenKeys ?? [])
    return buildLoadingList({
      equipment: this.equipment_.allEquipment_(),
      guestCount: event.guestCount,
      answers: (event.siteLogistics?.answers ?? []).filter((a) => !hidden.has(a.itemKey))
    })
  })

  private readonly loadedKeys_ = computed(() => new Set((this.event_()?.siteLogistics?.loaded ?? []).map((r) => r.key)))

  protected readonly groups_ = computed<LoadingGroup[]>(() => {
    const rows = this.rows_()
    const groups: LoadingGroup[] = []
    const equipmentRows = rows.filter((r) => r.source === 'equipment')
    if (equipmentRows.length) {
      groups.push({ key: 'equipment', title: 'equipment', equipment: true, rows: equipmentRows })
    }
    for (const section of this.registry_.sections_()) {
      const sectionRows = rows.filter((r) => r.source === 'logistics' && r.section === section)
      if (sectionRows.length) {
        groups.push({ key: section, title: this.registry_.sectionLabel(section), equipment: false, rows: sectionRows })
      }
    }
    return groups
  })

  protected readonly doneCount_ = computed(() => this.rows_().filter((r) => this.loadedKeys_().has(r.key)).length)
  protected readonly progress_ = computed(() =>
    this.t_('loading_list_progress')
      .replace('{x}', String(this.doneCount_()))
      .replace('{y}', String(this.rows_().length))
  )

  constructor() {
    this.document_.body.classList.add(BODY_CLASS)
    this.destroyRef_.onDestroy(() => this.document_.body.classList.remove(BODY_CLASS))
    void this.equipment_.ensureLoaded().finally(() => this.equipmentReady_.set(true))
  }

  // 6. METHODS
  protected isLoaded(key: string): boolean {
    return this.loadedKeys_().has(key)
  }

  protected isPending(key: string): boolean {
    return this.pendingKeys_().has(key)
  }

  protected async tick(row: LoadingRow, event: Event): Promise<void> {
    const box = event.target as HTMLInputElement
    const checked = box.checked
    this.pendingKeys_.update((s) => new Set(s).add(row.key))
    try {
      await this.pipeline_.saveLoading(this.eventId(), row.key, checked)
    } finally {
      this.pendingKeys_.update((s) => {
        const next = new Set(s)
        next.delete(row.key)
        return next
      })
      // A failed call leaves the box as the stored state says.
      box.checked = this.isLoaded(row.key)
    }
  }

  protected print(): void {
    window.print()
  }
}
