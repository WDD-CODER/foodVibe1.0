import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { formatVenueHours, VenueHoursSummary } from 'src/app/core/utils/venue-hours.util'

const ENV_TYPES: EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']
type VenueBulkField = 'environmentType'
/** Hold time before a press on a card enters selection mode. */
const LONG_PRESS_MS = 500
/** Finger/mouse travel (px) that cancels a long press, so scrolling never selects. */
const LONG_PRESS_MOVE_TOLERANCE = 10
/** history.state marker for the entry pushed while selecting, so Back leaves selection mode. */
const SELECTION_HISTORY_KEY = 'venueSelection'

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

  private longPressTimer_: ReturnType<typeof setTimeout> | null = null
  private longPressStart_: { x: number; y: number } | null = null
  /** The click that follows a completed long press must not also navigate or toggle. */
  private suppressNextClick_ = false
  /** True while our selection-mode history entry is on top of the stack. */
  private selectionHistoryPushed_ = false
  private readonly onPopState_ = (): void => {
    if (!this.selectionHistoryPushed_) return
    this.selectionHistoryPushed_ = false
    this.selection.clear()
  }

  protected envTypes = ENV_TYPES

  protected editableFields_ = computed<BulkEditableField[]>(() => [
    {
      key: 'environmentType',
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
    // Selection mode owns one history entry: entering pushes it (so Back clears the selection),
    // clearing any other way (selection bar, select-all off, last card unchecked) pops it.
    effect(() => {
      const selecting = this.selection.selectionMode()
      if (selecting && !this.selectionHistoryPushed_) {
        history.pushState({ ...history.state, [SELECTION_HISTORY_KEY]: true }, '')
        this.selectionHistoryPushed_ = true
      } else if (!selecting && this.selectionHistoryPushed_) {
        this.selectionHistoryPushed_ = false
        history.back()
      }
    })
  }

  ngOnInit(): void {
    window.addEventListener('popstate', this.onPopState_)
    void this.venueData.ensureLoaded()
    this.heroFab.setPageActions([{ labelKey: 'add_venue', icon: 'plus', run: () => this.onAddPlace() }], 'replace')
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions()
    window.removeEventListener('popstate', this.onPopState_)
    this.cancelLongPress()
    // Leaving the page (e.g. a card's edit button) while selecting: the pushed entry stays in
    // history as a harmless same-URL step; just stop tracking it.
    this.selectionHistoryPushed_ = false
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
          (v.nameHebrew ?? '').toLowerCase().includes(search) ||
          (v.environmentType ?? '').toLowerCase().includes(search)
      )
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

  /** Long press (touch or mouse) on a card enters selection mode with that card checked. */
  protected onCardPointerDown(item: VenueProfile, event: PointerEvent): void {
    // A long press on touch often ends without a click, so a stale flag is reset by the next press.
    this.suppressNextClick_ = false
    if (event.button !== 0) return
    const el = event.target as HTMLElement
    if (el.closest('button') || el.closest('a') || el.closest('app-list-row-checkbox')) return
    this.cancelLongPress()
    this.longPressStart_ = { x: event.clientX, y: event.clientY }
    this.longPressTimer_ = setTimeout(() => {
      this.longPressTimer_ = null
      this.longPressStart_ = null
      this.suppressNextClick_ = true
      this.selection.toggle(item._id ?? '')
      navigator.vibrate?.(30)
    }, LONG_PRESS_MS)
  }

  protected onCardPointerMove(event: PointerEvent): void {
    const start = this.longPressStart_
    if (!start) return
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (moved > LONG_PRESS_MOVE_TOLERANCE) this.cancelLongPress()
  }

  protected cancelLongPress(): void {
    if (this.longPressTimer_) clearTimeout(this.longPressTimer_)
    this.longPressTimer_ = null
    this.longPressStart_ = null
  }

  /** Stop the phone's long-press context menu / image callout from opening over the selection. */
  protected onCardContextMenu(event: Event): void {
    if (this.suppressNextClick_ || this.selection.selectionMode()) event.preventDefault()
  }

  protected onRowClick(item: VenueProfile, event: MouseEvent): void {
    if (this.suppressNextClick_) {
      this.suppressNextClick_ = false
      return
    }
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
    if (!(await this.confirmModal.open('למחוק את המיקום "' + (item.nameHebrew ?? '') + '"?', { variant: 'danger' })))
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
