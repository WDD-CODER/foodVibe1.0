import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  computed,
  inject,
  output,
  signal,
  OnInit,
  OnDestroy
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { VenueDataService } from '@services/venue-data.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { LoggingService } from '@services/logging.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { VenueProfile, EnvironmentType } from '@models/venue.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state'
import { TouchRowSelection } from 'src/app/shared/list-selection/touch-row-selection'
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component'
import { SelectionBarComponent } from 'src/app/shared/selection-bar/selection-bar.component'
import { BulkEditableField } from 'src/app/shared/selection-bar/bulk-editable-field.model'
import { useListState, StringParam, StringSetParam } from 'src/app/core/utils/list-state.util'
import { HeroFabService } from '@services/hero-fab.service'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
import { formatVenueHours, VenueHoursSummary } from 'src/app/core/utils/venue-hours.util'
import { useListControls, matchesSearch } from 'src/app/core/utils/list-controls.util'
import { TranslationService } from '@services/translation.service'

const ENV_TYPES: EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']
type VenueBulkField = 'environmentType'
/** history.state marker for the entry pushed while selecting, so Back leaves selection mode. */
const SELECTION_HISTORY_KEY = 'venueSelection'
/** Taps on these keep the selection: cards toggle, the bar and its dialogs act on it. */
const KEEP_SELECTION_TARGETS = '.venue-card, app-selection-bar, .select-all-pill, app-confirm-modal, .c-modal-overlay'

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
    SelectionBarComponent,
    InputClearComponent,
    ListShellComponent
  ],
  templateUrl: './venue-list.component.html',
  styleUrl: './venue-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['embeddedInDashboard']
})
export class VenueListComponent implements OnInit, OnDestroy {
  private readonly venueData = inject(VenueDataService)
  private readonly translation_ = inject(TranslationService)
  private readonly router = inject(Router)
  private readonly heroFab = inject(HeroFabService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly requireAuthService = inject(RequireAuthService)
  private readonly userMsg = inject(UserMsgService)
  private readonly logging = inject(LoggingService)
  private readonly confirmModal = inject(ConfirmModalService)

  /** When true, add button emits addVenueClick instead of navigating (e.g. dashboard tab switch). */
  embeddedInDashboard = false
  readonly addVenueClick = output<void>()

  protected searchQuery_ = signal('')
  protected readonly listControls = useListControls<never>({ search: this.searchQuery_ })
  protected deletingId_ = signal<string | null>(null)
  protected selectedEnvTypes_ = signal<Set<EnvironmentType>>(new Set())
  protected selection = new ListSelectionState()
  /** Touch devices select by long press (no checkboxes); mouse devices keep the hover checkbox. */
  protected touchSelect = new TouchRowSelection({
    selection: this.selection,
    historyKey: SELECTION_HISTORY_KEY,
    keepTargets: KEEP_SELECTION_TARGETS
  })

  protected envTypes = ENV_TYPES

  protected editableFields_ = computed<BulkEditableField[]>(() => [
    {
      key: 'environmentType',
      label: 'environment_type',
      options: this.envTypes.map((e) => ({ value: e, label: e })),
      multi: false
    }
  ])

  protected totalVenues_ = computed(() => this.venueData.allVenues_().length)

  protected readonly isPanelOpen_: WritableSignal<boolean>
  private readonly togglePanelState_: () => void

  constructor() {
    const panel = useResponsivePanelState('venues')
    this.isPanelOpen_ = panel.isPanelOpen_
    this.togglePanelState_ = panel.togglePanel

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

  protected togglePanel(): void {
    this.togglePanelState_()
  }

  protected hasActiveFilters_ = computed(() => this.selectedEnvTypes_().size > 0)

  protected clearAllFilters(): void {
    this.listControls.clearAll(() => this.selectedEnvTypes_.set(new Set()))
  }

  /** Visible venue IDs for header select-all. */
  protected filteredVenueIds_ = computed(() =>
    this.filteredVenues_()
      .map((v) => v._id ?? '')
      .filter(Boolean)
  )

  protected filteredVenues_ = computed(() => {
    let list = this.venueData.allVenues_()
    const search = this.searchQuery_().trim()
    const selectedEnv = this.selectedEnvTypes_()
    if (search) {
      list = list.filter((v) => matchesSearch(search, v.nameHebrew, v.environmentType))
    }
    if (selectedEnv.size > 0) {
      list = list.filter((v) => selectedEnv.has(v.environmentType))
    }
    return [...list].sort((a, b) => (a.nameHebrew ?? '').localeCompare(b.nameHebrew ?? '', 'he'))
  })

  /** Compact hours line for the card (plan 371). */
  protected venueHours(item: VenueProfile): VenueHoursSummary {
    return formatVenueHours(item.operatingHours)
  }

  protected envTypeLabel(env: EnvironmentType): string {
    return env
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
    if (this.touchSelect.consumeClick()) return
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
      if (field === 'environmentType') {
        void this.venueData.updateVenue({ ...item, environmentType: event.value as EnvironmentType })
      }
    }
  }

  protected async onBulkDeleteSelected(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    if (!this.requireAuthService.requireAuth()) return
    const message = this.translation_.translate('confirm_bulk_delete_venues').replace('{n}', String(ids.length))
    if (!(await this.confirmModal.open(message, { variant: 'danger' }))) return
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
    const message = this.translation_.translate('confirm_delete_venue_named').replace('{name}', item.nameHebrew ?? '')
    if (!(await this.confirmModal.open(message, { variant: 'danger' }))) return
    this.deletingId_.set(item._id)
    try {
      await this.venueData.deleteVenue(item._id)
    } catch (e) {
      this.logging.error({ event: 'venue.list_error', message: 'Venue list error', context: { err: e } })
    } finally {
      this.deletingId_.set(null)
    }
  }

  protected onClearSearch(input: HTMLInputElement): void {
    this.listControls.onClearSearch(input)
  }

  protected onSearchEscape(event: Event, input: HTMLInputElement): void {
    this.listControls.onSearchEscape(event, input)
  }
}
