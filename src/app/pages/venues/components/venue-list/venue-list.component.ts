import { ChangeDetectionStrategy, Component, computed, inject, output, signal, OnInit, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { VenueDataService } from '@services/venue-data.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { LoggingService } from '@services/logging.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { VenueProfile, EnvironmentType } from '@models/venue.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state'
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component'
import { SelectionBarComponent } from 'src/app/shared/selection-bar/selection-bar.component'
import { BulkEditableField } from 'src/app/shared/selection-bar/bulk-editable-field.model'
import { useListState, StringParam, StringSetParam } from 'src/app/core/utils/list-state.util'
import { HeroFabService } from '@services/hero-fab.service'

const ENV_TYPES: EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']
type VenueBulkField = 'environment_type_'

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    ListRowCheckboxComponent,
    SelectionBarComponent
  ],
  templateUrl: './venue-list.component.html',
  styleUrl: './venue-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['embeddedInDashboard']
})
export class VenueListComponent implements OnInit, OnDestroy {
  private readonly venueData = inject(VenueDataService)
  private readonly router = inject(Router)
  private readonly heroFab = inject(HeroFabService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly requireAuthService = inject(RequireAuthService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)
  private readonly confirmModal = inject(ConfirmModalService)

  /** When true, add button emits addVenueClick instead of navigating (e.g. dashboard tab switch). */
  embeddedInDashboard = false
  readonly addVenueClick = output<void>()

  protected searchQuery_ = signal('')
  protected deletingId_ = signal<string | null>(null)
  protected selectedEnvTypes_ = signal<Set<EnvironmentType>>(new Set())
  protected selection = new ListSelectionState()

  protected envTypes = ENV_TYPES

  protected editableFields_ = computed<BulkEditableField[]>(() => [
    {
      key: 'environment_type_',
      label: 'environment_type',
      options: this.envTypes.map((e) => ({ value: e, label: e })),
      multi: false
    }
  ])

  /** "N מתוך M פריטים" under the title — same wording as the list-shell chassis. */
  protected resultCountText_ = computed(() =>
    this.translation
      .translate('list_result_count')
      .replace('{n}', String(this.filteredVenues_().length))
      .replace('{m}', String(this.venueData.allVenues_().length))
  )

  constructor() {
    if (!this.embeddedInDashboard) {
      useListState('venues', [
        { urlParam: 'q', signal: this.searchQuery_, serializer: StringParam },
        { urlParam: 'envTypes', signal: this.selectedEnvTypes_, serializer: StringSetParam }
      ])
    }
  }

  ngOnInit(): void {
    void this.venueData.ensureLoaded()
    this.heroFab.setPageActions([{ labelKey: 'add_venue', icon: 'plus', run: () => this.onAddPlace() }], 'replace')
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions()
  }

  protected toggleEnvType(env: EnvironmentType): void {
    this.selectedEnvTypes_.update((set) => {
      const next = new Set(set)
      if (next.has(env)) next.delete(env)
      else next.add(env)
      return next
    })
  }

  protected hasActiveFilters_ = computed(() => this.selectedEnvTypes_().size > 0)

  protected clearAllFilters(): void {
    this.selectedEnvTypes_.set(new Set())
  }

  /** Visible venue IDs for header select-all. */
  protected filteredVenueIds_ = computed(() =>
    this.filteredVenues_()
      .map((v) => v._id ?? '')
      .filter(Boolean)
  )

  protected filteredVenues_ = computed(() => {
    let list = this.venueData.allVenues_()
    const search = this.searchQuery_().trim().toLowerCase()
    const selectedEnv = this.selectedEnvTypes_()
    if (search) {
      list = list.filter(
        (v) =>
          (v.name_hebrew ?? '').toLowerCase().includes(search) ||
          (v.environment_type_ ?? '').toLowerCase().includes(search)
      )
    }
    if (selectedEnv.size > 0) {
      list = list.filter((v) => selectedEnv.has(v.environment_type_))
    }
    return [...list].sort((a, b) => (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he'))
  })

  protected envTypeLabel(env: EnvironmentType): string {
    return env
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard'])
  }

  protected onAddPlace(): void {
    if (!this.requireAuthService.requireAuth()) return
    if (this.embeddedInDashboard) {
      this.addVenueClick.emit()
    } else {
      void this.router.navigate(['/venues/add'])
    }
  }

  onEdit(id: string): void {
    this.router.navigate(['/venues/edit', id])
  }

  protected onRowClick(item: VenueProfile, event: MouseEvent): void {
    const el = event.target as HTMLElement
    if (el.closest('button') || el.closest('a') || el.closest('app-list-row-checkbox')) return
    if (this.selection.selectionMode()) {
      this.selection.toggle(item._id ?? '')
      return
    }
    // Card click opens the read-only detail screen; the pencil icon (onEdit) still
    // jumps straight to the edit form for a quicker power-user path.
    this.router.navigate(['/venues/view', item._id])
  }

  /** Keyboard equivalent of a card click (Enter/Space) — same destination and same
   * nested-interactive-element guard as onRowClick (a keyboard user tabbed onto the
   * card's own edit/delete button must not also trigger the card's navigate/select). */
  protected onCardActivate(item: VenueProfile, event: Event): void {
    const el = event.target as HTMLElement
    if (el.closest('button') || el.closest('a') || el.closest('app-list-row-checkbox')) return
    if (this.selection.selectionMode()) {
      this.selection.toggle(item._id ?? '')
      return
    }
    this.router.navigate(['/venues/view', item._id])
  }

  protected onBulkEdit(event: { field: string; value: string; ids: string[] }): void {
    const field = event.field as VenueBulkField
    const venues = this.venueData.allVenues_()
    for (const id of event.ids) {
      const item = venues.find((v) => v._id === id)
      if (!item) continue
      if (field === 'environment_type_') {
        void this.venueData.updateVenue({ ...item, environment_type_: event.value as EnvironmentType })
      }
    }
  }

  protected async onBulkDeleteSelected(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    if (!this.requireAuthService.requireAuth()) return
    if (!(await this.confirmModal.open(`למחוק ${ids.length} מיקומים?`, { variant: 'danger' }))) return
    for (const id of ids) {
      this.deletingId_.set(id)
      try {
        await this.venueData.deleteVenue(id)
      } catch (e) {
        this.logging.error({ event: 'venue.list_error', message: 'Venue list error', context: { err: e } })
      } finally {
        this.deletingId_.set(null)
      }
    }
    this.selection.clear()
  }

  async onDelete(item: VenueProfile): Promise<void> {
    if (!this.requireAuthService.requireAuth()) return
    if (!(await this.confirmModal.open('למחוק את המיקום "' + (item.name_hebrew ?? '') + '"?', { variant: 'danger' })))
      return
    this.deletingId_.set(item._id)
    try {
      await this.venueData.deleteVenue(item._id)
    } catch (e) {
      this.logging.error({ event: 'venue.list_error', message: 'Venue list error', context: { err: e } })
    } finally {
      this.deletingId_.set(null)
    }
  }
}
