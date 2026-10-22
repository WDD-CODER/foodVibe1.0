import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { MenuEvent } from '@models/menu-event.model'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { formatMoney, formatPct1 } from 'src/app/core/engine/rounding'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { useListState, StringParam, ParamSerializer } from 'src/app/core/utils/list-state.util'
import { EVENT_STAGE_ORDER, isActiveStage, stageLabelKey } from 'src/app/core/utils/event-stage-ui.util'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { NewInquiryDialogComponent } from '../new-inquiry-dialog/new-inquiry-dialog.component'
import { useListControls, matchesSearch } from 'src/app/core/utils/list-controls.util'

export type SortField = 'name' | 'date' | 'food_cost' | 'guest_count'

/** Plan 443: `active` (live events, the default), `all`, or one stage key. */
const STAGE_FILTER_VALUES: readonly string[] = ['active', 'all', ...EVENT_STAGE_ORDER]
const StageFilterParam: ParamSerializer<string> = {
  toUrl: (v) => (v === 'active' ? null : v),
  fromUrl: (r) => (STAGE_FILTER_VALUES.includes(r) ? r : 'active'),
  toSession: (v) => v,
  fromSession: (r) => (typeof r === 'string' && STAGE_FILTER_VALUES.includes(r) ? r : 'active')
}

@Component({
  selector: 'app-menu-library-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    CustomSelectComponent,
    EmptyStateComponent,
    InputClearComponent,
    PageHeaderComponent,
    NewInquiryDialogComponent
  ],
  templateUrl: './menu-library-list.component.html',
  styleUrl: './menu-library-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuLibraryListComponent {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly menuEventData = inject(MenuEventDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly userMsg = inject(UserMsgService)
  private readonly requireAuthService = inject(RequireAuthService)
  private readonly translation = inject(TranslationService)

  protected readonly searchQuery_ = signal('')
  protected readonly eventTypeFilter_ = signal('all')
  protected readonly servingStyleFilter_ = signal('all')
  protected readonly dateFrom_ = signal('')
  protected readonly sortBy_ = signal<SortField>('date')
  protected readonly sortOrder_ = signal<'asc' | 'desc'>('desc')
  protected readonly listControls = useListControls<SortField>({
    search: this.searchQuery_,
    sortBy: this.sortBy_,
    sortOrder: this.sortOrder_
  })
  protected readonly cloningId_ = signal<string | null>(null)
  protected readonly deletingId_ = signal<string | null>(null)
  protected readonly stageFilter_ = signal('active')
  /** The "פנייה חדשה" form is open while the URL carries `?new=inquiry` (the FAB action and the header button both set it). */
  protected readonly isInquiryOpen_ = signal(false)
  protected readonly stageLabelKey = stageLabelKey

  constructor() {
    useListState('menu-library', [
      { urlParam: 'q', signal: this.searchQuery_, serializer: StringParam },
      { urlParam: 'sort', signal: this.sortBy_, serializer: StringParam },
      { urlParam: 'order', signal: this.sortOrder_, serializer: StringParam },
      { urlParam: 'eventType', signal: this.eventTypeFilter_, serializer: StringParam },
      { urlParam: 'style', signal: this.servingStyleFilter_, serializer: StringParam },
      { urlParam: 'dateFrom', signal: this.dateFrom_, serializer: StringParam },
      { urlParam: 'stage', signal: this.stageFilter_, serializer: StageFilterParam }
    ])
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.isInquiryOpen_.set(params.get('new') === 'inquiry'))
  }

  protected readonly events_ = this.menuEventData.allMenuEvents_

  protected readonly servingStyleOptions_: { value: string; label: string }[] = [
    { value: 'all', label: 'all' },
    { value: 'buffet_family', label: 'buffet_family' },
    { value: 'plated_course', label: 'plated_course' },
    { value: 'cocktail_passed', label: 'cocktail_passed' }
  ]

  protected readonly eventTypeOptions_ = computed(() => {
    const set = new Set<string>()
    this.events_().forEach((ev) => {
      if (ev.eventType) set.add(ev.eventType)
    })
    return ['all', ...Array.from(set)]
  })

  protected readonly eventTypeSelectOptions_ = computed(() =>
    this.eventTypeOptions_().map((t) => ({ value: t, label: t }))
  )

  protected readonly stageOptions_: { value: string; label: string }[] = [
    { value: 'active', label: 'stage_filter_active' },
    { value: 'all', label: 'stage_filter_all' },
    ...EVENT_STAGE_ORDER.map((stage) => ({ value: stage, label: stageLabelKey(stage) }))
  ]

  protected readonly sortBySelectOptions_: { value: SortField; label: string }[] = [
    { value: 'date', label: 'sort_by_date' },
    { value: 'name', label: 'sort_by_name' },
    { value: 'food_cost', label: 'menu_food_cost' },
    { value: 'guest_count', label: 'menu_guest_count' }
  ]

  protected readonly filteredEvents_ = computed(() => {
    const query = this.searchQuery_().trim()
    const type = this.eventTypeFilter_()
    const style = this.servingStyleFilter_()
    const from = this.dateFrom_()
    const stage = this.stageFilter_()
    const sortBy = this.sortBy_()
    const sortOrder = this.sortOrder_()

    let events = this.events_().filter((event) => {
      if (type !== 'all' && event.eventType !== type) return false
      if (style !== 'all' && event.servingType !== style) return false
      if (stage === 'active' ? !isActiveStage(event.stage) : stage !== 'all' && (event.stage ?? 'inquiry') !== stage)
        return false
      if (from && (!event.eventDate || event.eventDate < from)) return false
      if (query) {
        if (!matchesSearch(query, event.name, event.eventType, event.eventDate, ...(event.cuisineTags || [])))
          return false
      }
      return true
    })

    events = [...events].sort((a, b) => {
      if (sortBy === 'food_cost') {
        // Events without a pricing summary (or without revenue) sort last, whichever the direction.
        const x = this.foodCostRatio(a)
        const y = this.foodCostRatio(b)
        if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
      }
      const cmp = this.compareEvents(a, b, sortBy)
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return events
  })

  /** Plan 445: food cost ÷ revenue from the pricing summary stored on save; null when there is none. */
  private foodCostRatio(event: MenuEvent): number | null {
    const pricing = event.pricing
    return pricing && pricing.revenue > 0 ? pricing.foodCost / pricing.revenue : null
  }

  private compareEvents(a: MenuEvent, b: MenuEvent, field: SortField): number {
    switch (field) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '', 'he')
      case 'date':
        return (a.eventDate || '').localeCompare(b.eventDate || '')
      case 'food_cost':
        return (this.foodCostRatio(a) ?? 0) - (this.foodCostRatio(b) ?? 0)
      case 'guest_count':
        return (a.guestCount ?? 0) - (b.guestCount ?? 0)
      default:
        return 0
    }
  }

  protected setSort(field: SortField): void {
    this.listControls.setSort(field)
  }

  protected onCreateNew(): void {
    this.router.navigate(['/menu-intelligence'])
  }

  protected openInquiry(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { new: 'inquiry' },
      queryParamsHandling: 'merge'
    })
  }

  protected closeInquiry(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { new: null }, queryParamsHandling: 'merge' })
  }

  protected onOpen(event: MenuEvent): void {
    this.router.navigate(['/menu-intelligence', event._id])
  }

  protected async onClone(event: MenuEvent): Promise<void> {
    this.cloningId_.set(event._id)
    try {
      const cloned = await this.menuEventData.cloneMenuEventAsNew(event._id)
      this.router.navigate(['/menu-intelligence', cloned._id])
    } finally {
      this.cloningId_.set(null)
    }
  }

  protected async onDelete(event: MenuEvent): Promise<void> {
    if (!this.requireAuthService.requireAuth()) return
    const ok = await this.confirmModal.open('menu_confirm_delete', {
      saveLabel: 'delete',
      variant: 'danger'
    })
    if (!ok) return
    this.deletingId_.set(event._id)
    try {
      await this.menuEventData.deleteMenuEvent(event._id)
    } finally {
      this.deletingId_.set(null)
    }
  }

  /** Food cost % of the revenue, both read from the pricing summary stored on save ("—" when there is none). */
  protected getFoodCostPctDisplay(event: MenuEvent): string {
    const ratio = this.foodCostRatio(event)
    return ratio === null ? '—' : formatPct1(ratio * 100)
  }

  /** Revenue as the pricing meter showed it on the last save ("—" when there is none). */
  protected getTotalSalePriceDisplay(event: MenuEvent): string {
    const revenue = event.pricing?.revenue ?? 0
    return revenue > 0 ? formatMoney(revenue) : '—'
  }

  protected getGuestCountDisplay(event: MenuEvent): string {
    return String(event.guestCount || 0)
  }

  protected getSectionCount(event: MenuEvent): number {
    return event.sections?.length || 0
  }

  protected getDishCount(event: MenuEvent): number {
    return (event.sections || []).reduce((sum, s) => sum + (s.items?.length || 0), 0)
  }

  /** Translation key for current sort order (א–ת, ת–א, ישן לחדש, etc.). */
  protected getSortOrderLabel(): string {
    const order = this.sortOrder_()
    switch (this.sortBy_()) {
      case 'name':
        return order === 'asc' ? 'sort_name_az' : 'sort_name_za'
      case 'date':
        return order === 'asc' ? 'sort_date_old_new' : 'sort_date_new_old'
      case 'food_cost':
      case 'guest_count':
        return order === 'asc' ? 'sort_number_low_high' : 'sort_number_high_low'
      default:
        return order === 'asc' ? 'sort_number_low_high' : 'sort_number_high_low'
    }
  }

  protected toggleSortOrder(): void {
    this.sortOrder_.update((o) => (o === 'asc' ? 'desc' : 'asc'))
  }

  protected onDateWrapClick(input: HTMLInputElement | undefined): void {
    if (input?.showPicker) {
      input.showPicker()
    }
  }

  protected onClearSearch(input: HTMLInputElement): void {
    this.listControls.onClearSearch(input)
  }

  protected onSearchEscape(event: Event, input: HTMLInputElement): void {
    this.listControls.onSearchEscape(event, input)
  }
}
