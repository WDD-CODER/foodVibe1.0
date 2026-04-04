import { Component, inject, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { KitchenStateService } from '@services/kitchen-state.service';
import { EquipmentDataService } from '@services/equipment-data.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { BulkEditableField } from 'src/app/shared/selection-bar/bulk-editable-field.model';
import { UserMsgService } from '@services/user-msg.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { Product } from '@models/product.model';
import { UnitRegistryService } from '@services/unit-registry.service';
import { TranslationService } from '@services/translation.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { UserService } from '@services/user.service';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component';
import { CarouselHeaderComponent, CarouselHeaderColumnDirective } from 'src/app/shared/carousel-header/carousel-header.component';
import { CellCarouselComponent, CellCarouselSlideDirective } from 'src/app/shared/cell-carousel/cell-carousel.component';
import { HeroFabService } from '@services/hero-fab.service';
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state';
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component';
import { SelectionBarComponent } from 'src/app/shared/selection-bar/selection-bar.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { useListState, StringParam, NullableStringParam, FilterRecordParam, BooleanParam } from 'src/app/core/utils/list-state.util';
import { getPanelOpen, setPanelOpen } from 'src/app/core/utils/panel-preference.util';
import { getPricePerUnit, calcBuyPriceGlobal } from 'src/app/core/utils/product-price.util';

export type SortField = 'name' | 'category' | 'allergens' | 'supplier' | 'date';
type ProductBulkField = 'categories_' | 'supplierIds_' | 'allergens_' | 'base_unit_';

@Component({
  selector: 'inventory-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    TranslatePipe,
    ClickOutSideDirective,
    LoaderComponent,
    ListShellComponent,
    CarouselHeaderComponent,
    CarouselHeaderColumnDirective,
    CellCarouselComponent,
    CellCarouselSlideDirective,
    ListRowCheckboxComponent,
    SelectionBarComponent,
    EmptyStateComponent,
  ],
  templateUrl: './inventory-product-list.component.html',
  styleUrl: './inventory-product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryProductListComponent implements OnInit, OnDestroy {
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly heroFab = inject(HeroFabService);
  private readonly translationService = inject(TranslationService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly userMsg = inject(UserMsgService);
  protected readonly unitRegistry = inject(UnitRegistryService);
  protected readonly isLoggedIn = inject(UserService).isLoggedIn;
  private readonly metadataRegistry = inject(MetadataRegistryService);

  private lastPriceEdit_ = { productId: '', unit: '', value: 0 };

  protected activeFilters_ = signal<Record<string, string[]>>({});
  protected searchQuery_ = signal<string>('');
  protected sortBy_ = signal<SortField | null>(null);
  protected sortOrder_ = signal<'asc' | 'desc'>('asc');
  protected isPanelOpen_ = signal<boolean>(getPanelOpen('inventory'));
  protected expandedFilterCategories_ = signal<Set<string>>(new Set());
  protected allergenPopoverProductId_ = signal<string | null>(null);
  protected allergenExpandAll_ = signal<boolean>(false);
  protected lowStockOnly_ = signal<boolean>(false);
  protected deletingId_ = signal<string | null>(null);
  protected savingPriceId_ = signal<string | null>(null);
  protected carouselHeaderIndex_ = signal(0);
  protected selection = new ListSelectionState();

  protected editableFields_ = computed<BulkEditableField[]>(() => [
    {
      key: 'categories_',
      label: 'category',
      options: this.metadataRegistry.allCategories_().map(c => ({ value: c, label: c })),
      multi: true,
    },
    {
      key: 'supplierIds_',
      label: 'supplier',
      options: this.kitchenStateService.suppliers_().map(s => ({ value: s._id, label: s.name_hebrew })),
      multi: true,
    },
    {
      key: 'allergens_',
      label: 'allergens',
      options: this.metadataRegistry.allAllergens_().map(a => ({ value: a, label: a })),
      multi: true,
    },
    {
      key: 'base_unit_',
      label: 'unit',
      options: this.unitRegistry.allUnitKeys_().map(u => ({ value: u, label: u })),
      multi: false,
    },
  ])

  constructor() {
    useListState('inventory', [
      { urlParam: 'q',        signal: this.searchQuery_,    serializer: StringParam },
      { urlParam: 'sort',     signal: this.sortBy_,         serializer: NullableStringParam },
      { urlParam: 'order',    signal: this.sortOrder_,      serializer: StringParam },
      { urlParam: 'filters',  signal: this.activeFilters_,  serializer: FilterRecordParam },
      { urlParam: 'lowStock', signal: this.lowStockOnly_,   serializer: BooleanParam },
    ]);

    afterNextRender(() => {
      if (typeof window === 'undefined') return;
      const q = window.matchMedia('(max-width: 768px)');
      q.addEventListener('change', (e) => { if (e.matches) this.isPanelOpen_.set(false); });
    });
  }

  ngOnInit(): void {
    this.heroFab.setPageActions(
      [{ labelKey: 'add_product', icon: 'plus', run: () => this.router.navigate(['/inventory/add']) }],
      'replace'
    );
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions();
  }

  // LISTING
  protected filterCategories_ = computed(() => {
    const products = this.kitchenStateService.products_();
    const filters = this.activeFilters_();
    const categories: Record<string, Set<string>> = {};
    products.forEach(product => {
      if (product.allergens_?.length) {
        if (!categories['Allergens']) categories['Allergens'] = new Set();
        product.allergens_.forEach(a => categories['Allergens'].add(a));
      }
      const cats = product.categories_ ?? [];
      cats.forEach(cat => {
        if (!categories['Category']) categories['Category'] = new Set();
        categories['Category'].add(cat);
      });
      const supplierIds = product.supplierIds_ ?? [];
      supplierIds.forEach(id => {
        if (!categories['Supplier']) categories['Supplier'] = new Set();
        categories['Supplier'].add(id);
      });
    });

    return Object.keys(categories).map(name => ({
      name,
      displayKey: this.categoryDisplayKey(name),
      options: Array.from(categories[name]).map(option => ({
        label: name === 'Supplier' ? this.getSupplierName(option) : option,
        value: option,
        checked_: (filters[name] || []).includes(option)
      }))
    }));
  });

  protected categoryDisplayKey(internalName: string): string {
    const map: Record<string, string> = {
      'Category': 'category',
      'Allergens': 'allergens',
      'Supplier': 'supplier'
    };
    return map[internalName] ?? internalName.toLowerCase();
  }

  protected toggleFilterCategory(name: string): void {
    this.expandedFilterCategories_.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  protected isCategoryExpanded(name: string): boolean {
    return this.expandedFilterCategories_().has(name);
  }

  protected onPanelToggled(): void {
    this.isPanelOpen_.update(v => !v);
    setPanelOpen('inventory', this.isPanelOpen_());
  }

  protected onCarouselHeaderChange(index: number): void {
    this.carouselHeaderIndex_.set(index);
  }

  protected isEmptyList_ = computed(() => this.kitchenStateService.products_().length === 0);

  protected filteredProducts_ = computed(() => {
    let products = this.kitchenStateService.products_();
    const filters = this.activeFilters_();
    const search = this.searchQuery_().trim().toLowerCase();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();
    const lowStockOnly = this.lowStockOnly_();

    if (lowStockOnly) {
      products = products.filter(p => (p.min_stock_level_ ?? 0) > 0);
    }

    // 1. Apply filters
    if (Object.keys(filters).length > 0) {
      products = products.filter(product => {
        return Object.entries(filters).every(([category, selectedValues]) => {
          let productValues: string[] = [];
          if (category === 'Allergens') productValues = product.allergens_ || [];
          else if (category === 'Category') productValues = product.categories_ ?? [];
          else if (category === 'Supplier') productValues = product.supplierIds_ ?? [];
          return selectedValues.some(v => productValues.includes(v));
        });
      });
    }

    // 2. Apply search (within filtered results)
    if (search) {
      products = products.filter(p => (p.name_hebrew ?? '').toLowerCase().includes(search));
    }

    // 3. Apply sort
    if (sortBy) {
      products = [...products].sort((a, b) => {
        const cmp = this.compareProducts(a, b, sortBy);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return products;
  });

  /** Visible product IDs for header select-all. */
  protected filteredProductIds_ = computed(() =>
    this.filteredProducts_().map(p => p._id ?? '').filter(Boolean)
  );

  private compareProducts(a: Product, b: Product, field: SortField): number {
    const hebrewCompare = (aStr: string, bStr: string) =>
      (aStr || '').localeCompare(bStr || '', 'he');
    switch (field) {
      case 'name':
        return hebrewCompare(a.name_hebrew || '', b.name_hebrew || '');
      case 'category': {
        const aStr = this.getCategoryDisplay(a.categories_ ?? []);
        const bStr = this.getCategoryDisplay(b.categories_ ?? []);
        return hebrewCompare(aStr, bStr);
      }
      case 'allergens': {
        const aVal = this.translationService.translate((a.allergens_?.[0] ?? '') as string);
        const bVal = this.translationService.translate((b.allergens_?.[0] ?? '') as string);
        return hebrewCompare(aVal, bVal);
      }
      case 'supplier':
        return hebrewCompare(this.getSupplierNames(a.supplierIds_ ?? []), this.getSupplierNames(b.supplierIds_ ?? []));
      case 'date':
        return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      default:
        return 0;
    }
  }

  protected setSort(field: SortField): void {
    const current = this.sortBy_();
    if (current === field) {
      this.sortOrder_.update(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set('asc');
    }
  }

  protected toggleAllergenExpandAll(): void {
    this.allergenExpandAll_.update(v => !v);
    this.allergenPopoverProductId_.set(null);
  }

  protected toggleAllergenPopover(productId: string): void {
    this.allergenExpandAll_.set(false);
    this.allergenPopoverProductId_.update(id => (id === productId ? null : productId));
  }

  protected closeAllergenView(clickTarget?: EventTarget | null): void {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null;
    if (el?.closest('thead .col-allergens')) return;
    this.allergenPopoverProductId_.set(null);
    this.allergenExpandAll_.set(false);
  }

  protected sortIconFor_(field: SortField): 'arrow-up' | 'arrow-down' | 'arrow-up-down' {
    const current = this.sortBy_();
    if (current !== field) return 'arrow-up-down';
    return this.sortOrder_() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  // FILTERING
  protected toggleFilter(categoryName: string, optionValue: string): void {
    this.activeFilters_.update(prev => {
      const current = { ...prev };
      const values = current[categoryName] || [];
      if (values.includes(optionValue)) {
        current[categoryName] = values.filter(v => v !== optionValue);
        if (current[categoryName].length === 0) delete current[categoryName];
      } else {
        current[categoryName] = [...values, optionValue];
      }
      return current;
    });
  }

  protected clearAllFilters(): void {
    this.lowStockOnly_.set(false);
    this.activeFilters_.set({});
  }

  protected isLowStock(product: Product): boolean {
    return (product.min_stock_level_ ?? 0) > 0;
  }

  protected hasActiveFilters_ = computed(() =>
    this.lowStockOnly_() || Object.values(this.activeFilters_()).some(arr => arr.length > 0)
  );

  protected toggleLowStockOnly(): void {
    this.lowStockOnly_.update(v => !v);
  }

  protected selectedCountInCategory(category: { options: { checked_: boolean }[] }): number {
    return category.options.filter(o => o.checked_).length;
  }

  protected onAddProduct(): void {
    this.router.navigate(['/inventory/add']);
  }

  onEditProduct(_id: string): void {
    this.router.navigate(['/inventory/edit', _id]);
  }

  protected onRowClick(product: Product, event: MouseEvent): void {
    const el = event.target as HTMLElement;
    if (el.closest('button') || el.closest('a') || el.closest('.allergen-btn-wrapper') || el.closest('app-list-row-checkbox')) return;
    if (this.selection.selectionMode()) {
      this.selection.toggle(product._id ?? '');
      return;
    }
    this.router.navigate(['/inventory/edit', product._id]);
  }

  // DELETE
  protected onDeleteProduct(_id: string): void {
    if (confirm('האם אתה בטוח שברצונך למחוק חומר גלם זה?')) {
      this.deletingId_.set(_id);
      this.kitchenStateService.deleteProduct(_id).subscribe({
        next: () => { this.deletingId_.set(null); },
        error: () => { this.deletingId_.set(null); }
      });
    }
  }

  protected onBulkDeleteSelected(ids: string[]): void {
    if (ids.length === 0) return;
    if (!confirm(`למחוק ${ids.length} מוצרים?`)) return;
    ids.forEach(id => {
      this.kitchenStateService.deleteProduct(id).subscribe({ next: () => {}, error: () => {} });
    });
    this.selection.clear();
  }

  protected getSupplierName(supplierId: string): string {
    if (!supplierId) return '';
    const supplier = this.kitchenStateService.suppliers_().find(s => s._id === supplierId);
    return supplier?.name_hebrew ?? supplierId;
  }

  protected getSupplierNames(ids: string[] | undefined): string {
    return (ids ?? []).map(id => this.getSupplierName(id)).filter(Boolean).join(', ');
  }

  protected getCategoryDisplay(ids: string[] | undefined): string {
    return ((ids ?? []).map(id => this.translationService.translate(id)).filter(Boolean).join(', ')) || '';
  }

  /** Price per 1 of the given unit (converted from buy_price_global_ which is per base_unit) */
  protected getPricePerUnit(product: Product, unit: string): number {
    return getPricePerUnit(product, unit, this.unitRegistry)
  }

  // INLINE UPDATE
  protected onUnitChange(product: Product, newUnit: string): void {
    const oldBase = product.base_unit_ || 'unit';
    const oldPrice = product.buy_price_global_ ?? 0;
    let newPrice = oldPrice;
    if (newUnit !== oldBase) {
      const opt = (product.purchase_options_ || []).find(o => o.unit_symbol_ === newUnit);
      if (opt?.conversion_rate_) {
        newPrice = oldPrice * opt.conversion_rate_;
      } else {
        const baseConv = this.unitRegistry.getConversion(oldBase);
        const unitConv = this.unitRegistry.getConversion(newUnit);
        if (baseConv && unitConv) newPrice = oldPrice * (unitConv / baseConv);
      }
    }
    const updated: Product = { ...product, base_unit_: newUnit, buy_price_global_: newPrice };
    this.kitchenStateService.saveProduct(updated).subscribe({ next: () => {}, error: () => {} });
  }

  protected onPriceFocus(product: Product, displayUnit: string): void {
    this.lastPriceEdit_ = {
      productId: product._id ?? '',
      unit: displayUnit,
      value: this.getPricePerUnit(product, displayUnit)
    };
  }

  protected async onPriceBlur(product: Product, displayUnit: string, event: Event, inputEl: HTMLInputElement): Promise<void> {
    const newValue = parseFloat((event.target as HTMLInputElement).value) || 0;
    const originalValue = this.lastPriceEdit_.value;
    if (Math.abs(newValue - originalValue) < 0.001) return;

    const confirmed = await this.confirmModal.open('save_price_confirm', { saveLabel: 'save_price' });
    if (confirmed) {
      this.onPriceChange(product, displayUnit, newValue);
    } else {
      inputEl.value = String(originalValue);
    }
  }

  protected onBulkEdit(event: { field: string; value: string; ids: string[] }): void {
    const field = event.field as ProductBulkField
    const products = this.kitchenStateService.products_()
    for (const id of event.ids) {
      const product = products.find(p => p._id === id)
      if (!product) continue
      let updated: Product
      if (field === 'supplierIds_' || field === 'categories_' || field === 'allergens_') {
        const current = (product[field] ?? []) as string[]
        if (current.includes(event.value)) continue
        updated = { ...product, [field]: [...current, event.value] }
      } else {
        updated = { ...product, base_unit_: event.value }
      }
      this.kitchenStateService.saveProduct(updated).subscribe({ next: () => {}, error: () => {} })
    }
  }

  protected onPriceChange(product: Product, displayUnit: string, value: string | number): void {
    const pricePerUnit = typeof value === 'string' ? parseFloat(value) || 0 : (value as number)
    const buyPriceGlobal = calcBuyPriceGlobal(product, displayUnit, pricePerUnit, this.unitRegistry)
    const updated: Product = { ...product, buy_price_global_: buyPriceGlobal };
    this.savingPriceId_.set(product._id ?? '');
    this.kitchenStateService.saveProduct(updated).subscribe({
      next: () => { this.savingPriceId_.set(null); },
      error: () => { this.savingPriceId_.set(null); }
    });
  }

}