import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, computed, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { KitchenStateService } from '@services/kitchen-state.service';
import { Router } from '@angular/router';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { Product } from '@models/product.model';
import { UnitRegistryService } from '@services/unit-registry.service';
import { TranslationService } from '@services/translation.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';

export type SortField = 'name' | 'category' | 'allergens' | 'supplier' | 'date';

const MOBILE_BREAKPOINT_PX = 768;

@Component({
  selector: 'inventory-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, SelectOnFocusDirective, ClickOutSideDirective, LoaderComponent],
  templateUrl: './inventory-product-list.component.html',
  styleUrl: './inventory-product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryProductListComponent implements OnDestroy {

  // INJECTIONS
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);
  private readonly confirmModal = inject(ConfirmModalService);
  protected readonly unitRegistry = inject(UnitRegistryService);

  private lastPriceEdit_ = { productId: '', unit: '', value: 0 };
  private mediaQueryList: MediaQueryList | null = null;
  private mediaListener: (() => void) | null = null;

  // INITIAL STATE
  protected activeFilters_ = signal<Record<string, string[]>>({});
  protected searchQuery_ = signal<string>('');
  protected sortBy_ = signal<SortField | null>(null);
  protected sortOrder_ = signal<'asc' | 'desc'>('asc');
  protected isPanelOpen_ = signal<boolean>(true);
  protected expandedFilterCategories_ = signal<Set<string>>(new Set());
  protected allergenPopoverProductId_ = signal<string | null>(null);
  protected allergenExpandAll_ = signal<boolean>(false);
  protected deletingId_ = signal<string | null>(null);
  protected savingPriceId_ = signal<string | null>(null);
  protected isMobile_ = signal<boolean>(false);

  constructor() {
    afterNextRender(() => {
      this.mediaQueryList = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT_PX + 1}px)`);
      this.isMobile_.set(!this.mediaQueryList.matches);
      this.mediaListener = () => {
        this.isMobile_.set(!this.mediaQueryList!.matches);
      };
      this.mediaQueryList.addEventListener('change', this.mediaListener);
    });
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

  protected filteredProducts_ = computed(() => {
    let products = this.kitchenStateService.products_();
    const filters = this.activeFilters_();
    const search = this.searchQuery_().trim().toLowerCase();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();

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

  protected togglePanel(): void {
    this.isPanelOpen_.update(v => !v);
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
    if (el?.closest('.products-grid-header .col-allergens')) return;
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
    this.activeFilters_.set({});
  }

  protected hasActiveFilters_ = computed(() =>
    Object.values(this.activeFilters_()).some(arr => arr.length > 0)
  );

  protected selectedCountInCategory(category: { options: { checked_: boolean }[] }): number {
    return category.options.filter(o => o.checked_).length;
  }

  protected onAddProduce(): void {
    this.router.navigate(['/inventory/add']);
  }

  // UPDATE
  onEditProduct(_id: string): void {
    this.router.navigate(['/inventory/edit', _id]);
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

  /** Units available for this product: base_unit + purchase_options */
  protected getProductUnits(product: Product): string[] {
    const base = product.base_unit_ || 'unit';
    const fromOptions = (product.purchase_options_ || []).map(o => o.unit_symbol_).filter(Boolean);
    const all = [base, ...fromOptions];
    return [...new Set(all)];
  }

  /** Price per 1 of the given unit (converted from buy_price_global_ which is per base_unit) */
  protected getPricePerUnit(product: Product, unit: string): number {
    const base = product.base_unit_ || 'unit';
    if (unit === base) return product.buy_price_global_ ?? 0;
    const opt = (product.purchase_options_ || []).find(o => o.unit_symbol_ === unit);
    if (opt?.conversion_rate_) {
      return (product.buy_price_global_ ?? 0) * opt.conversion_rate_;
    }
    const baseConv = this.unitRegistry.getConversion(base);
    const unitConv = this.unitRegistry.getConversion(unit);
    if (baseConv && unitConv) {
      return (product.buy_price_global_ ?? 0) * (unitConv / baseConv);
    }
    return product.buy_price_global_ ?? 0;
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

  protected onPriceChange(product: Product, displayUnit: string, value: string | number): void {
    const pricePerUnit = typeof value === 'string' ? parseFloat(value) || 0 : (value as number);
    const base = product.base_unit_ || 'unit';
    let buyPriceGlobal = pricePerUnit;
    if (displayUnit !== base) {
      const opt = (product.purchase_options_ || []).find(o => o.unit_symbol_ === displayUnit);
      if (opt?.conversion_rate_) {
        buyPriceGlobal = pricePerUnit / opt.conversion_rate_;
      } else {
        const baseConv = this.unitRegistry.getConversion(base);
        const unitConv = this.unitRegistry.getConversion(displayUnit);
        if (baseConv && unitConv) buyPriceGlobal = pricePerUnit * (baseConv / unitConv);
      }
    }
    const updated: Product = { ...product, buy_price_global_: buyPriceGlobal };
    this.savingPriceId_.set(product._id ?? '');
    this.kitchenStateService.saveProduct(updated).subscribe({
      next: () => { this.savingPriceId_.set(null); },
      error: () => { this.savingPriceId_.set(null); }
    });
  }

  // DESTROY
  ngOnDestroy(): void {
    this.mediaQueryList?.removeEventListener('change', this.mediaListener ?? (() => {}));
  }
}