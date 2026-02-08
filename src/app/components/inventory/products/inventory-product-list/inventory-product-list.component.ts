import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { FilterCategory } from '@models/filter-category.model';
import { FilterOption } from '@models/filter-option.model';
import { ProductDataService } from '@services/product-data.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Router } from '@angular/router';
import { Product } from '@models/product.model';
import { KitchenUnit } from '@models/units.enum';

@Component({
  selector: 'inventory-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './inventory-product-list.component.html',
  styleUrl: './inventory-product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryProductListComponent implements OnDestroy {

  // INJECTIONS
  private readonly ProductDataService = inject(ProductDataService);
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly router = inject(Router);

  // INITIAL STATE
  protected activeFilters_ = signal<Record<string, string[]>>({});

  // INITIALIZATION & MIGRATION
  // constructor() {
  //   effect(() => {
  //     const legacyProducts = this.ProductDataService.allProducts_() as any[];
  //     if (legacyProducts.length === 0) return;

  //     const products: Product[] = legacyProducts.map(product => {
  //       const props = product['properties'] || {};
  //       const units = product['units'] || {};
  //       const pUnit = units['purchase']?.['symbol'] || props['purchase_unit_'] || 'ק"ג';
  //       const bUnit = units['recipe']?.['symbol'] || props['uom'] || 'גרם';

  //       return {
  //         _id: product['_id'] || crypto.randomUUID(),
  //         name_hebrew: product['productName'] || 'ללא שם',
  //         category_: props['topCategory'] || 'כללי',
  //         supplierId_: 'ספק כללי',
  //         purchase_price_: Number(props['gross_price_'] || props['purchasePrice'] || 0),
  //         purchase_unit_: pUnit as KitchenUnit,
  //         base_unit_: bUnit as KitchenUnit,
  //         conversion_factor_: Number(props['conversion_factor_'] || 1000),
  //         yield_factor_: Number(props['yieldFactor'] || (1 - (props['waste_percent_'] || 0) / 100)),
  //         allergens_: product['allergenIds'] || [],
  //         min_stock_level_: 0,
  //         is_dairy_: false,
  //         expiry_days_default_: 3
  //       };
  //     });

  //     this.kitchenStateService.products_.set(products);
  //   });
  // }

  // LISTING
  protected filterCategories_ = computed(() => {
    const products = this.kitchenStateService.products_();
    const categories: Record<string, Set<string>> = {};
    products.forEach(product => {
      if (product.allergens_?.length) {
        if (!categories['Allergens']) categories['Allergens'] = new Set();
        product.allergens_.forEach(a => categories['Allergens'].add(a));
      }
      if (product.category_) {
        if (!categories['Category']) categories['Category'] = new Set();
        categories['Category'].add(product.category_);
      }
      if (product.supplierId_) {
        if (!categories['Supplier']) categories['Supplier'] = new Set();
        categories['Supplier'].add(product.supplierId_);
      }
    });

    return Object.keys(categories).map(name => ({
      name,
      options: Array.from(categories[name]).map(option => ({
        label: option,
        value: option,
        checked_: false
      }))
    }));
  });

  protected filteredProducts_ = computed(() => {
    const products = this.kitchenStateService.products_();
    const filters = this.activeFilters_();

    if (Object.keys(filters).length === 0) return products;

    return products.filter(product => {
      return Object.entries(filters).every(([category, selectedValues]) => {
        let productValues: string[] = [];
        if (category === 'Allergens') productValues = product.allergens_ || [];
        else if (category === 'Category') productValues = product.category_ ? [product.category_] : [];
        else if (category === 'Supplier') productValues = product.supplierId_ ? [product.supplierId_] : [];

        return selectedValues.some(v => productValues.includes(v));
      });
    });
  });

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

  // CREATE
  protected onCreateProduct(): void {
    this.router.navigate(['inventory', 'add']);
  }

  // UPDATE
  onEditProduct(_id: string): void {
    // We will use these signals in the next step to open the Side Drawer
    this.router.navigate(['/inventory/edit', _id])
    // this.kitchenStateService.selectedProductId_.set(_id);
    // this.kitchenStateService.isDrawerOpen_.set(true);
  }


  // DELETE
  protected onDeleteProduct(_id: string): void {
    if (confirm('האם אתה בטוח שברצונך למחוק חומר גלם זה?')) {
      this.kitchenStateService.deleteProduct(_id).subscribe({
        next: res => console.log('res', res),
        error: err => console.log('Error', err)
      })
    }
  }
  // DESTROY
  ngOnDestroy(): void { }
}