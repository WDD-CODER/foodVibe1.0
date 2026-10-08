import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  OnInit,
  OnDestroy,
  WritableSignal
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { SupplierDataService } from '@services/supplier-data.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import { Supplier } from '@models/supplier.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { UserService } from '@services/user.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { LoggingService } from '@services/logging.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { CellCarouselComponent, CellCarouselSlideDirective } from 'src/app/shared/cell-carousel/cell-carousel.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import {
  CarouselHeaderComponent,
  CarouselHeaderColumnDirective
} from 'src/app/shared/carousel-header/carousel-header.component'
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state'
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component'
import { SelectionBarComponent } from 'src/app/shared/selection-bar/selection-bar.component'
import { BulkEditableField } from 'src/app/shared/selection-bar/bulk-editable-field.model'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { useListState, StringParam, BooleanParam, NumberSetParam } from 'src/app/core/utils/list-state.util'
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
import { useCollapsibleCategories } from 'src/app/core/utils/collapsible-categories.util'
import { HeroFabService } from '@services/hero-fab.service'
import { getSupplierIds } from '@utils/product-source.util'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'

const DAY_LABELS = ['day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat']
type SupplierBulkField = 'deliveryDays' | 'leadTimeDays'

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    CellCarouselComponent,
    CellCarouselSlideDirective,
    ListShellComponent,
    CarouselHeaderComponent,
    CarouselHeaderColumnDirective,
    ListRowCheckboxComponent,
    SelectionBarComponent,
    EmptyStateComponent,
    RowActionsMenuComponent,
    InputClearComponent
  ],
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierListComponent implements OnInit, OnDestroy {
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  protected readonly supplierData = inject(SupplierDataService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly heroFab = inject(HeroFabService)
  private readonly translation = inject(TranslationService)
  private readonly router = inject(Router)
  private readonly requireAuthService = inject(RequireAuthService)
  private readonly logging = inject(LoggingService)
  private readonly confirmModal = inject(ConfirmModalService)

  protected searchQuery_ = signal('')
  protected deletingId_ = signal<string | null>(null)
  protected readonly isPanelOpen_: WritableSignal<boolean>
  private readonly togglePanelState_: () => void
  protected carouselHeaderIndex_ = signal(0)

  protected selection = new ListSelectionState()

  protected editableFields_: BulkEditableField[] = [
    {
      key: 'deliveryDays',
      label: 'delivery_days',
      options: DAY_LABELS.map((label, i) => ({ value: String(i), label })),
      multi: true
    },
    {
      key: 'leadTimeDays',
      label: 'lead_time',
      options: ['1', '2', '3', '5', '7', '10', '14', '21', '30'].map((d) => ({ value: d, label: d })),
      multi: false
    }
  ]

  constructor() {
    const panel = useResponsivePanelState('suppliers')
    this.isPanelOpen_ = panel.isPanelOpen_
    this.togglePanelState_ = panel.togglePanel

    useListState('suppliers', [
      { urlParam: 'q', signal: this.searchQuery_, serializer: StringParam },
      { urlParam: 'days', signal: this.selectedDays_, serializer: NumberSetParam },
      { urlParam: 'linkedOnly', signal: this.hasLinkedOnly_, serializer: BooleanParam }
    ])

    // Open the delivery-days category whenever it gains a selection (e.g. restored from the URL).
    let hadDays = false
    effect(() => {
      const hasDays = this.selectedDays_().size > 0
      if (hasDays && !hadDays) this.filterCategories.expandIfActive('delivery_days', true)
      hadDays = hasDays
    })
  }

  ngOnInit(): void {
    this.heroFab.setPageActions([{ labelKey: 'add_supplier', icon: 'plus', run: () => this.onAdd() }], 'replace')
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions()
  }

  /** Delivery days to filter (0=Sun .. 6=Sat). Empty set = show all. */
  protected selectedDays_ = signal<Set<number>>(new Set())
  protected hasLinkedOnly_ = signal(false)
  /** Filter-category open state: collapsed on mobile (≤1023px), expanded on desktop (plan 345). */
  protected readonly filterCategories = useCollapsibleCategories()

  protected isEmptyList_ = computed(() => this.supplierData.allSuppliers_().length === 0)

  protected hasActiveFilters_ = computed(() => {
    const days = this.selectedDays_()
    const linked = this.hasLinkedOnly_()
    return days.size > 0 || linked
  })

  protected filteredSuppliers_ = computed(() => {
    let list = this.supplierData.allSuppliers_()
    const search = this.searchQuery_().trim().toLowerCase()
    const days = this.selectedDays_()
    const linkedOnly = this.hasLinkedOnly_()

    if (search) {
      list = list.filter(
        (s) =>
          (s.nameHebrew ?? '').toLowerCase().includes(search) || (s.contactPerson ?? '').toLowerCase().includes(search)
      )
    }
    if (days.size > 0) {
      list = list.filter((s) => (s.deliveryDays ?? []).some((d) => days.has(d)))
    }
    if (linkedOnly) {
      list = list.filter((s) => this.linkedProductCount_(s._id) > 0)
    }
    return [...list].sort((a, b) => (a.nameHebrew ?? '').localeCompare(b.nameHebrew ?? '', 'he'))
  })

  /** Visible supplier IDs for header select-all. */
  protected filteredSupplierIds_ = computed(() =>
    this.filteredSuppliers_()
      .map((s) => s._id ?? '')
      .filter(Boolean)
  )

  protected togglePanel(): void {
    this.togglePanelState_()
  }

  protected onCarouselHeaderChange(index: number): void {
    this.carouselHeaderIndex_.set(index)
  }

  protected toggleDay(day: number): void {
    this.selectedDays_.update((set) => {
      const next = new Set(set)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  protected clearAllFilters(): void {
    this.selectedDays_.set(new Set())
    this.hasLinkedOnly_.set(false)
  }

  protected linkedProductCount_(supplierId: string): number {
    return this.kitchenState.products_().filter((p) => getSupplierIds(p).includes(supplierId)).length
  }

  protected onAdd(): void {
    if (!this.requireAuthService.requireAuth()) return
    this.router.navigate(['/suppliers/add'])
  }

  protected onRowClick(item: Supplier, event: MouseEvent): void {
    const el = event.target as HTMLElement
    if (el.closest('button') || el.closest('a') || el.closest('app-list-row-checkbox')) return
    if (this.selection.selectionMode()) {
      this.selection.toggle(item._id ?? '')
      return
    }
    this.onEdit(item)
  }

  protected onEdit(item: Supplier): void {
    if (!this.requireAuthService.requireAuth()) return
    this.router.navigate(['/suppliers/edit', item._id])
  }

  async onDelete(item: Supplier): Promise<void> {
    if (!this.requireAuthService.requireAuth()) return
    const count = this.linkedProductCount_(item._id)
    if (count > 0) {
      if (!(await this.confirmModal.open('supplier_in_use_cannot_delete', { variant: 'warning' }))) return
    } else if (
      !(await this.confirmModal.open('למחוק את הספק "' + (item.nameHebrew ?? '') + '"?', { variant: 'danger' }))
    )
      return
    this.deletingId_.set(item._id)
    try {
      await this.supplierData.removeSupplier(item._id)
    } catch (e) {
      this.logging.error({ event: 'supplier.list_error', message: 'Supplier list error', context: { err: e } })
    } finally {
      this.deletingId_.set(null)
    }
  }

  protected async onBulkDeleteSelected(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    if (!this.requireAuthService.requireAuth()) return
    if (!(await this.confirmModal.open(`למחוק ${ids.length} ספקים?`, { variant: 'danger' }))) return
    for (const id of ids) {
      this.deletingId_.set(id)
      try {
        await this.supplierData.removeSupplier(id)
      } catch (e) {
        this.logging.error({ event: 'supplier.list_error', message: 'Supplier list error', context: { err: e } })
      } finally {
        this.deletingId_.set(null)
      }
    }
    this.selection.clear()
  }

  protected async onBulkEdit(event: { field: string; value: string; ids: string[] }): Promise<void> {
    const field = event.field as SupplierBulkField
    const suppliers = this.supplierData.allSuppliers_()
    for (const id of event.ids) {
      const supplier = suppliers.find((s) => s._id === id)
      if (!supplier) continue
      let updated: Supplier
      if (field === 'deliveryDays') {
        const day = parseInt(event.value, 10)
        const current = supplier.deliveryDays ?? []
        if (current.includes(day)) continue
        updated = { ...supplier, deliveryDays: [...current, day] }
      } else {
        updated = { ...supplier, leadTimeDays: parseInt(event.value, 10) }
      }
      void this.supplierData.updateSupplier(updated)
    }
  }

  /** Min-order cell: "₪500", or "—" when empty or 0 (plan 361). */
  protected minOrderDisplay(value: number | null | undefined): string {
    return value ? `₪${value}` : '—'
  }

  protected deliveryDaysDisplay(days: number[] | undefined): string {
    if (!days?.length) return '—'
    return days.map((d) => this.translation.translate(DAY_LABELS[d]) || String(d)).join(', ')
  }

  /** Search clear (X) — same effect as deleting the text; keeps focus in the field (plan 363). */
  protected onClearSearch(input: HTMLInputElement): void {
    this.searchQuery_.set('')
    input.focus()
  }

  /** Escape in a non-empty search clears it, like the X (plan 363). */
  protected onSearchEscape(event: Event, input: HTMLInputElement): void {
    if (!this.searchQuery_()) return
    event.preventDefault()
    event.stopPropagation()
    this.onClearSearch(input)
  }
}
