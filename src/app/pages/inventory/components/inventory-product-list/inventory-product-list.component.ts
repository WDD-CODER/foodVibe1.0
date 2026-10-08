import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy,
  WritableSignal
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'

import { KitchenStateService } from '@services/kitchen-state.service'
import { EquipmentDataService } from '@services/equipment-data.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { BulkEditableField } from 'src/app/shared/selection-bar/bulk-editable-field.model'
import { UserMsgService } from '@services/user-msg.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { Product } from '@models/product.model'
import { UnitRegistryService } from '@services/unit-registry.service'
import { TranslationService } from '@services/translation.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { MasterPushService } from '@services/master-push.service'
import { UserService } from '@services/user.service'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { HeroFabService } from '@services/hero-fab.service'
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state'
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component'
import { SelectionBarComponent } from 'src/app/shared/selection-bar/selection-bar.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import {
  useListState,
  StringParam,
  NullableStringParam,
  FilterRecordParam,
  BooleanParam,
  NumberParam
} from 'src/app/core/utils/list-state.util'
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
import { useCollapsibleCategories } from 'src/app/core/utils/collapsible-categories.util'
import { getPricePerUnit, calcBuyPriceGlobal } from 'src/app/core/utils/product-price.util'
import {
  getProductValidationStatus,
  getProductMissingFields,
  VALIDATION_FIELD_ICONS,
  ProductValidationStatus
} from 'src/app/core/utils/product-validation.util'
import { getEffectivePrice, getSupplierIds } from '@utils/product-source.util'
import { buildFilterOptionCounts, attachFilterCheckedState } from '@utils/filter-category-counts.util'
import { NutritionBadgeComponent } from 'src/app/shared/nutrition-badge/nutrition-badge.component'
import { ProductDataService } from '@services/product-data.service'
import { AiProductModalService } from 'src/app/shared/ai-product-modal/ai-product-modal.service'
import { resolveDraftMetadata, registerDraftMetadata } from '../../services/ai-draft-metadata.util'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'
import { COLUMN_CAROUSEL } from 'src/app/shared/column-carousel'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'

export type SortField = 'name' | 'category' | 'allergens' | 'supplier' | 'date'
type ProductBulkField = 'categories' | 'supplierIds_' | 'allergens' | 'baseUnit'

@Component({
  selector: 'inventory-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ClickOutSideDirective,
    LoaderComponent,
    ListShellComponent,
    ListRowCheckboxComponent,
    SelectionBarComponent,
    EmptyStateComponent,
    NutritionBadgeComponent,
    RowActionsMenuComponent,
    ...COLUMN_CAROUSEL,
    InputClearComponent
  ],
  templateUrl: './inventory-product-list.component.html',
  styleUrl: './inventory-product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryProductListComponent implements OnInit, OnDestroy {
  protected readonly kitchenStateService = inject(KitchenStateService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly heroFab = inject(HeroFabService)
  private readonly translationService = inject(TranslationService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly masterPush_ = inject(MasterPushService)
  private readonly equipmentData = inject(EquipmentDataService)
  private readonly userMsg = inject(UserMsgService)
  protected readonly unitRegistry = inject(UnitRegistryService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly productData_ = inject(ProductDataService)
  private readonly aiProductModal_ = inject(AiProductModalService)

  private lastPriceEdit_ = { productId: '', unit: '', value: 0 }

  protected activeFilters_ = signal<Record<string, string[]>>({})
  protected searchQuery_ = signal<string>('')
  protected sortBy_ = signal<SortField | null>(null)
  protected sortOrder_ = signal<'asc' | 'desc'>('asc')
  protected readonly isPanelOpen_: WritableSignal<boolean>
  private readonly togglePanelState_: () => void
  /** Filter-category open state: all collapsed on mobile (≤1023px), all expanded on desktop (plan 345). */
  protected readonly filterCategories = useCollapsibleCategories()
  protected allergenPopoverProductId_ = signal<string | null>(null)
  protected allergenExpandAll_ = signal<boolean>(false)
  protected lowStockOnly_ = signal<boolean>(false)
  protected showInvalidOnly_ = signal<boolean>(false)
  protected showIncompleteOnly_ = signal<boolean>(false)
  protected nutritionFilter_ = signal<'all' | 'has' | 'missing'>('all')
  protected deletingId_ = signal<string | null>(null)
  protected savingPriceId_ = signal<string | null>(null)
  protected selection = new ListSelectionState()

  protected editableFields_ = computed<BulkEditableField[]>(() => [
    {
      key: 'categories',
      label: 'category',
      options: this.metadataRegistry.allCategories_().map((c) => ({ value: c, label: c })),
      multi: true
    },
    {
      key: 'supplierIds_',
      label: 'supplier',
      options: this.kitchenStateService.suppliers_().map((s) => ({ value: s._id, label: s.nameHebrew })),
      multi: true
    },
    {
      key: 'allergens',
      label: 'allergens',
      options: this.metadataRegistry.allAllergens_().map((a) => ({ value: a, label: a })),
      multi: true
    },
    {
      key: 'baseUnit',
      label: 'unit',
      options: this.unitRegistry.allUnitKeys_().map((u) => ({ value: u, label: u })),
      multi: false
    }
  ])

  constructor() {
    const panel = useResponsivePanelState('inventory')
    this.isPanelOpen_ = panel.isPanelOpen_
    this.togglePanelState_ = panel.togglePanel

    useListState('inventory', [
      { urlParam: 'q', signal: this.searchQuery_, serializer: StringParam },
      { urlParam: 'sort', signal: this.sortBy_, serializer: NullableStringParam },
      { urlParam: 'order', signal: this.sortOrder_, serializer: StringParam },
      { urlParam: 'filters', signal: this.activeFilters_, serializer: FilterRecordParam },
      { urlParam: 'lowStock', signal: this.lowStockOnly_, serializer: BooleanParam },
      { urlParam: 'nutrition', signal: this.nutritionFilter_, serializer: StringParam },
      { urlParam: 'page', signal: this.currentPage_, serializer: NumberParam }
    ])

    // Open any category that gains a selected value (e.g. restored from the URL), so the
    // active filter is visible even on mobile where categories start collapsed.
    let prevActive = new Set<string>()
    effect(() => {
      const filters = this.activeFilters_()
      const active = new Set(Object.keys(filters).filter((name) => (filters[name]?.length ?? 0) > 0))
      active.forEach((name) => {
        if (!prevActive.has(name)) this.filterCategories.expandIfActive(name, true)
      })
      prevActive = active
    })

    // Pagination (plan 304 M3): jump back to page 1 whenever the filtered/sorted result
    // set changes, so a search/filter doesn't strand the user on a now-irrelevant page.
    // Skips its first run so a page restored from the URL/session (e.g. navigating back
    // from a product) isn't immediately stomped back to 1.
    let skipFirstPageReset = true
    effect(() => {
      this.filteredProductIds_()
      if (skipFirstPageReset) {
        skipFirstPageReset = false
        return
      }
      this.currentPage_.set(1)
    })
  }

  ngOnInit(): void {
    this.heroFab.setPageActions(
      [
        { labelKey: 'add_product', icon: 'plus', run: () => this.router.navigate(['/inventory/add']) },
        { labelKey: 'ai_product_create_new', icon: 'sparkles', run: () => this.openAiCreateModal() }
      ],
      'replace'
    )
  }

  private openAiCreateModal(): void {
    this.aiProductModal_.open('create', undefined, async (draft) => {
      const { categories, allergens } = await resolveDraftMetadata(draft, this.metadataRegistry)
      const payload = {
        nameHebrew: draft.nameHebrew,
        baseUnit: draft.baseUnit,
        categories,
        allergens,
        yieldFactor: draft.yieldFactor,
        minStockLevel: draft.minStockLevel,
        expiryDaysDefault: draft.expiryDaysDefault,
        // purchaseOptions deliberately omitted: AI unit symbols don't map to UnitRegistry keys
        purchaseOptions: [],
        sources: []
      }
      const created = await this.productData_.addProduct(payload)
      // Confirming the AI create IS the save — only now do the values enter Metadata.
      await registerDraftMetadata({ categories, allergens }, this.metadataRegistry)
      void this.router.navigate(['/inventory/edit', created._id])
    })
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions()
  }

  // LISTING
  // Catalog-only pass — recomputes when the product list changes, NOT on every
  // filter-checkbox toggle (see filter-category-counts.util.ts).
  private filterOptionCounts_ = computed(() => {
    const products = this.kitchenStateService.products_()
    return buildFilterOptionCounts(products, (product, bump) => {
      product.allergens?.forEach((a) => bump('Allergens', a))
      ;(product.categories ?? []).forEach((cat) => bump('Category', cat))
      getSupplierIds(product).forEach((id) => bump('Supplier', id))
    })
  })

  // Filters-only pass — cheap, bounded by option count, not catalog size.
  protected filterCategories_ = computed(() =>
    attachFilterCheckedState(
      this.filterOptionCounts_(),
      this.activeFilters_(),
      (name) => this.categoryDisplayKey(name),
      (name, value) => (name === 'Supplier' ? this.getSupplierName(value) : value)
    )
  )

  protected categoryDisplayKey(internalName: string): string {
    const map: Record<string, string> = {
      Category: 'category',
      Allergens: 'allergens',
      Supplier: 'supplier'
    }
    return map[internalName] ?? internalName.toLowerCase()
  }

  protected toggleFilterCategory(name: string): void {
    this.filterCategories.toggle(name)
  }

  protected isCategoryExpanded(name: string): boolean {
    return this.filterCategories.isExpanded(name)
  }

  protected onPanelToggled(): void {
    this.togglePanelState_()
  }

  protected isEmptyList_ = computed(() => this.kitchenStateService.products_().length === 0)

  protected filteredProducts_ = computed(() => {
    let products = this.kitchenStateService.products_()
    const filters = this.activeFilters_()
    const search = this.searchQuery_().trim().toLowerCase()
    const sortBy = this.sortBy_()
    const sortOrder = this.sortOrder_()
    const lowStockOnly = this.lowStockOnly_()
    const showInvalidOnly = this.showInvalidOnly_()
    const showIncompleteOnly = this.showIncompleteOnly_()
    const nutritionFilter = this.nutritionFilter_()

    if (lowStockOnly) {
      products = products.filter((p) => (p.minStockLevel ?? 0) > 0)
    }

    if (showInvalidOnly || showIncompleteOnly) {
      products = products.filter((p) => {
        const status = getProductValidationStatus(p)
        if (showInvalidOnly && status === 'invalid') return true
        if (showIncompleteOnly && status === 'incomplete') return true
        return false
      })
    }

    if (nutritionFilter === 'has') {
      products = products.filter((p) => !!p.nutritionPer100g)
    } else if (nutritionFilter === 'missing') {
      products = products.filter((p) => !p.nutritionPer100g)
    }

    // 1. Apply filters
    if (Object.keys(filters).length > 0) {
      products = products.filter((product) => {
        return Object.entries(filters).every(([category, selectedValues]) => {
          let productValues: string[] = []
          if (category === 'Allergens') productValues = product.allergens || []
          else if (category === 'Category') productValues = product.categories ?? []
          else if (category === 'Supplier') productValues = getSupplierIds(product)
          return selectedValues.some((v) => productValues.includes(v))
        })
      })
    }

    // 2. Apply search (within filtered results)
    if (search) {
      products = products.filter((p) => (p.nameHebrew ?? '').toLowerCase().includes(search))
    }

    // 3. Apply sort
    if (sortBy) {
      products = [...products].sort((a, b) => {
        const cmp = this.compareProducts(a, b, sortBy)
        return sortOrder === 'asc' ? cmp : -cmp
      })
    }

    return products
  })

  /** Visible product IDs for header select-all. */
  protected filteredProductIds_ = computed(() =>
    this.filteredProducts_()
      .map((p) => p._id ?? '')
      .filter(Boolean)
  )

  /**
   * Precomputed per-row values (plan 303 M2). The template previously called
   * getValidationStatus/getCategoryDisplay/getProductSupplierNames/getPricePerUnit
   * directly per row on every change-detection pass. Derive them once per data change instead.
   */
  protected readonly displayRows_ = computed(() =>
    this.filteredProducts_().map((product) => {
      const validationStatus = this.getValidationStatus(product)
      return {
        product,
        validationStatus,
        missingFields: validationStatus === 'valid' ? [] : this.getMissingFields(product),
        category: this.getCategoryDisplay(product.categories),
        supplierNames: this.getProductSupplierNames(product),
        pricePerUnit: this.getPricePerUnit(product, product.baseUnit)
      }
    })
  )

  // Pagination (plan 304 M3) — see recipe-book-list.component.ts for the full rationale
  // (cdk-virtual-scroll is incompatible with the shared .c-list-row display:contents grid).
  protected readonly PAGE_SIZE = 50
  protected readonly currentPage_ = signal(1)
  protected readonly totalPages_ = computed(() => Math.max(1, Math.ceil(this.displayRows_().length / this.PAGE_SIZE)))
  protected readonly displayPage_ = computed(() => Math.min(this.currentPage_(), this.totalPages_()))
  protected readonly pagedRows_ = computed(() => {
    const start = (this.displayPage_() - 1) * this.PAGE_SIZE
    return this.displayRows_().slice(start, start + this.PAGE_SIZE)
  })
  protected readonly pageIndicatorText_ = computed(() =>
    this.translationService
      .translate('page_indicator')
      .replace('{n}', String(this.displayPage_()))
      .replace('{m}', String(this.totalPages_()))
  )

  protected goToPrevPage(): void {
    this.currentPage_.update((p) => Math.max(1, p - 1))
  }

  protected goToNextPage(): void {
    this.currentPage_.update((p) => Math.min(this.totalPages_(), p + 1))
  }

  private compareProducts(a: Product, b: Product, field: SortField): number {
    const hebrewCompare = (aStr: string, bStr: string) => (aStr || '').localeCompare(bStr || '', 'he')
    switch (field) {
      case 'name':
        return hebrewCompare(a.nameHebrew || '', b.nameHebrew || '')
      case 'category': {
        const aStr = this.getCategoryDisplay(a.categories ?? [])
        const bStr = this.getCategoryDisplay(b.categories ?? [])
        return hebrewCompare(aStr, bStr)
      }
      case 'allergens': {
        const aVal = this.translationService.translate((a.allergens?.[0] ?? '') as string)
        const bVal = this.translationService.translate((b.allergens?.[0] ?? '') as string)
        return hebrewCompare(aVal, bVal)
      }
      case 'supplier':
        return hebrewCompare(this.getSupplierNames(getSupplierIds(a)), this.getSupplierNames(getSupplierIds(b)))
      case 'date':
        return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
      default:
        return 0
    }
  }

  protected setSort(field: SortField): void {
    const current = this.sortBy_()
    if (current === field) {
      this.sortOrder_.update((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      this.sortBy_.set(field)
      this.sortOrder_.set('asc')
    }
  }

  protected toggleAllergenExpandAll(): void {
    this.allergenExpandAll_.update((v) => !v)
    this.allergenPopoverProductId_.set(null)
  }

  protected toggleAllergenPopover(productId: string): void {
    this.allergenExpandAll_.set(false)
    this.allergenPopoverProductId_.update((id) => (id === productId ? null : productId))
  }

  protected closeAllergenView(clickTarget?: EventTarget | null): void {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null
    if (el?.closest('thead .col-allergens')) return
    this.allergenPopoverProductId_.set(null)
    this.allergenExpandAll_.set(false)
  }

  protected sortIconFor_(field: SortField): 'arrow-up' | 'arrow-down' | 'arrow-up-down' {
    const current = this.sortBy_()
    if (current !== field) return 'arrow-up-down'
    return this.sortOrder_() === 'asc' ? 'arrow-up' : 'arrow-down'
  }

  // FILTERING
  protected toggleFilter(categoryName: string, optionValue: string): void {
    this.activeFilters_.update((prev) => {
      const current = { ...prev }
      const values = current[categoryName] || []
      if (values.includes(optionValue)) {
        current[categoryName] = values.filter((v) => v !== optionValue)
        if (current[categoryName].length === 0) delete current[categoryName]
      } else {
        current[categoryName] = [...values, optionValue]
      }
      return current
    })
  }

  protected clearAllFilters(): void {
    this.lowStockOnly_.set(false)
    this.showInvalidOnly_.set(false)
    this.showIncompleteOnly_.set(false)
    this.nutritionFilter_.set('all')
    this.activeFilters_.set({})
  }

  protected toggleNutritionFilter(value: 'has' | 'missing'): void {
    this.nutritionFilter_.update((current) => (current === value ? 'all' : value))
  }

  protected isLowStock(product: Product): boolean {
    return (product.minStockLevel ?? 0) > 0
  }

  // VALIDATION STATUS
  protected getValidationStatus(product: Product): ProductValidationStatus {
    return getProductValidationStatus(product)
  }

  protected getMissingFields(product: Product): string[] {
    return getProductMissingFields(product)
  }

  protected getFieldIcon(fieldKey: string): string {
    return VALIDATION_FIELD_ICONS[fieldKey] ?? 'alert-circle'
  }

  protected toggleShowInvalidOnly(): void {
    this.showInvalidOnly_.update((v) => !v)
  }

  protected toggleShowIncompleteOnly(): void {
    this.showIncompleteOnly_.update((v) => !v)
  }

  protected hasActiveFilters_ = computed(
    () =>
      this.lowStockOnly_() ||
      this.showInvalidOnly_() ||
      this.showIncompleteOnly_() ||
      this.nutritionFilter_() !== 'all' ||
      Object.values(this.activeFilters_()).some((arr) => arr.length > 0)
  )

  protected toggleLowStockOnly(): void {
    this.lowStockOnly_.update((v) => !v)
  }

  protected selectedCountInCategory(category: { options: { checked_: boolean }[] }): number {
    return category.options.filter((o) => o.checked_).length
  }

  protected onAddProduct(): void {
    this.router.navigate(['/inventory/add'])
  }

  onEditProduct(_id: string): void {
    this.router.navigate(['/inventory/edit', _id])
  }

  protected onRowClick(product: Product, event: MouseEvent): void {
    const el = event.target as HTMLElement
    if (
      el.closest('button') ||
      el.closest('a') ||
      el.closest('.allergen-btn-wrapper') ||
      el.closest('app-list-row-checkbox')
    )
      return
    if (this.selection.selectionMode()) {
      this.selection.toggle(product._id ?? '')
      return
    }
    this.router.navigate(['/inventory/edit', product._id])
  }

  // DELETE
  protected async onDeleteProduct(_id: string): Promise<void> {
    const product = this.kitchenStateService.products_().find((p) => p._id === _id)
    const affected = this.kitchenStateService
      .recipes_()
      .filter((r) => (r.ingredients ?? []).some((i) => i.referenceId === _id))

    const confirmMessage =
      affected.length > 0
        ? `חומר הגלם הזה בשימוש ב-${affected.length} מתכונים/מנות. מחיקה תסיר אותו מכולם. להמשיך?`
        : 'confirm_delete_product'
    if (!(await this.confirmModal.open(confirmMessage, { variant: 'danger' }))) return

    const scope = await this.masterPush_.askDeleteScope(product ?? null, { entity: 'product' })
    if (scope === 'cancel') return

    this.deletingId_.set(_id)
    try {
      if (affected.length > 0) {
        await this.kitchenStateService.cascadeRemoveIngredientForAll(_id)
      }
      await firstValueFrom(this.kitchenStateService.deleteProduct(_id))
      if (scope === 'everyone' && product?._masterId) {
        this.masterPush_.deleteProductFromMaster(product)
        this.masterPush_.purgeProductIngredientEverywhere(product)
      }
    } catch {
      // Swallow — kitchenStateService.deleteProduct already surfaces its own error toast.
    } finally {
      this.deletingId_.set(null)
    }
  }

  protected async onBulkDeleteSelected(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    const productsById = new Map(this.kitchenStateService.products_().map((p) => [p._id, p]))
    const recipes = this.kitchenStateService.recipes_()
    const affectedByProduct = new Map<string, number>()
    let totalAffected = 0
    for (const id of ids) {
      const count = recipes.filter((r) => (r.ingredients ?? []).some((i) => i.referenceId === id)).length
      if (count > 0) {
        affectedByProduct.set(id, count)
        totalAffected += count
      }
    }
    const inUseCount = affectedByProduct.size

    const confirmMessage =
      inUseCount > 0
        ? `${inUseCount} מתוך ${ids.length} המוצרים שנבחרו בשימוש ב-${totalAffected} מתכונים/מנות בסך הכל. מחיקה תסיר אותם מכולם. להמשיך?`
        : `למחוק ${ids.length} מוצרים?`
    if (!(await this.confirmModal.open(confirmMessage, { variant: 'danger' }))) return

    const masterLinkedProduct = ids.map((id) => productsById.get(id)).find((p) => p?._masterId)
    const scope = await this.masterPush_.askDeleteScope(masterLinkedProduct ?? null, {
      entity: 'product',
      count: ids.length
    })
    if (scope === 'cancel') return

    for (const id of ids) {
      const product = productsById.get(id)
      try {
        if (affectedByProduct.has(id)) {
          await this.kitchenStateService.cascadeRemoveIngredientForAll(id)
        }
        await firstValueFrom(this.kitchenStateService.deleteProduct(id))
        if (scope === 'everyone' && product?._masterId) {
          this.masterPush_.deleteProductFromMaster(product)
          this.masterPush_.purgeProductIngredientEverywhere(product)
        }
      } catch {
        // Swallow — kitchenStateService.deleteProduct already surfaces its own error toast.
      }
    }
    this.selection.clear()
  }

  protected getSupplierName(supplierId: string): string {
    if (!supplierId) return ''
    const supplier = this.kitchenStateService.suppliersById_().get(supplierId)
    return supplier?.nameHebrew ?? supplierId
  }

  protected getSupplierNames(ids: string[] | undefined): string {
    return (ids ?? [])
      .map((id) => this.getSupplierName(id))
      .filter(Boolean)
      .join(', ')
  }

  protected getProductSupplierNames(product: Product): string {
    return this.getSupplierNames(getSupplierIds(product))
  }

  protected getCategoryDisplay(ids: string[] | undefined): string {
    return (
      (ids ?? [])
        .map((id) => this.translationService.translate(id))
        .filter(Boolean)
        .join(', ') || ''
    )
  }

  /** Price per 1 of the given unit (converted from buy_price_global_ which is per base_unit) */
  protected getPricePerUnit(product: Product, unit: string): number {
    return getPricePerUnit(product, unit, this.unitRegistry)
  }

  // INLINE UPDATE
  protected onUnitChange(product: Product, newUnit: string): void {
    const oldBase = product.baseUnit || 'unit'
    const oldPrice = getEffectivePrice(product)
    let newPrice = oldPrice
    if (newUnit !== oldBase) {
      const opt = (product.purchaseOptions || []).find((o) => o.unitSymbol === newUnit)
      if (opt?.conversionRate) {
        newPrice = oldPrice * opt.conversionRate
      } else {
        const baseConv = this.unitRegistry.getConversion(oldBase)
        const unitConv = this.unitRegistry.getConversion(newUnit)
        if (baseConv && unitConv) newPrice = oldPrice * (unitConv / baseConv)
      }
    }
    const newSources = (product.sources ?? []).map((s) => ({ ...s, price: newPrice }))
    const updated: Product = {
      ...product,
      baseUnit: newUnit,
      sources: newSources.length ? newSources : [{ supplierId: '', price: newPrice, addedAt: Date.now() }]
    }
    this.kitchenStateService.saveProduct(updated).subscribe({ next: () => {}, error: () => {} })
  }

  protected onPriceFocus(product: Product, displayUnit: string): void {
    this.lastPriceEdit_ = {
      productId: product._id ?? '',
      unit: displayUnit,
      value: this.getPricePerUnit(product, displayUnit)
    }
  }

  protected async onPriceBlur(
    product: Product,
    displayUnit: string,
    event: Event,
    inputEl: HTMLInputElement
  ): Promise<void> {
    const newValue = parseFloat((event.target as HTMLInputElement).value) || 0
    const originalValue = this.lastPriceEdit_.value
    if (Math.abs(newValue - originalValue) < 0.001) return

    const confirmed = await this.confirmModal.open('save_price_confirm', { saveLabel: 'save_price' })
    if (confirmed) {
      this.onPriceChange(product, displayUnit, newValue)
    } else {
      inputEl.value = String(originalValue)
    }
  }

  protected onBulkEdit(event: { field: string; value: string; ids: string[] }): void {
    const field = event.field as ProductBulkField
    const products = this.kitchenStateService.products_()
    for (const id of event.ids) {
      const product = products.find((p) => p._id === id)
      if (!product) continue
      let updated: Product
      if (field === 'supplierIds_') {
        const currentIds = getSupplierIds(product)
        if (currentIds.length === 1 && currentIds[0] === event.value) continue
        // Bulk "change supplier" replaces — every selected product ends up with exactly this supplier.
        const newSource = { supplierId: event.value, price: getEffectivePrice(product), addedAt: Date.now() }
        updated = { ...product, sources: [newSource] }
      } else if (field === 'categories' || field === 'allergens') {
        const current = (product[field] ?? []) as string[]
        if (current.includes(event.value)) continue
        updated = { ...product, [field]: [...current, event.value] }
      } else {
        updated = { ...product, baseUnit: event.value }
      }
      this.kitchenStateService.saveProduct(updated).subscribe({ next: () => {}, error: () => {} })
    }
  }

  protected onPriceChange(product: Product, displayUnit: string, value: string | number): void {
    const pricePerUnit = typeof value === 'string' ? parseFloat(value) || 0 : (value as number)
    const buyPriceGlobal = calcBuyPriceGlobal(product, displayUnit, pricePerUnit, this.unitRegistry)
    const newSources = (product.sources ?? []).map((s) => ({ ...s, price: buyPriceGlobal }))
    const updated: Product = {
      ...product,
      sources: newSources.length ? newSources : [{ supplierId: '', price: buyPriceGlobal, addedAt: Date.now() }]
    }
    this.savingPriceId_.set(product._id ?? '')
    this.kitchenStateService.saveProduct(updated).subscribe({
      next: () => {
        this.savingPriceId_.set(null)
      },
      error: () => {
        this.savingPriceId_.set(null)
      }
    })
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
