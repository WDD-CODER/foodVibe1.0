import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import type { ItemLedger } from '@models/ingredient.model';
import { FilterCategory } from '@models/filter-category.model';
import { FilterOption } from '@models/filter-option.model';
import { ItemDataService } from '@services/items-data.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Router } from '@angular/router';
import { Product } from '@models/product.model';
import { KitchenUnit } from '@models/units.enum';

@Component({
  selector: 'inventory-item-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './inventory-item-list.component.html',
  styleUrl: './inventory-item-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemListComponent implements OnDestroy {

  // INJECTIONS
  private readonly itemDataService = inject(ItemDataService);
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly router = inject(Router);

  // INITIAL STATE
  protected activeFilters_ = signal<Record<string, string[]>>({});

  // INITIALIZATION & MIGRATION
  constructor() {
    effect(() => {
      const legacyItems = this.itemDataService.allItems_() as any[];
      if (legacyItems.length === 0) return;

      const products: Product[] = legacyItems.map(item => {
        const props = item['properties'] || {};
        const units = item['units'] || {};
        const pUnit = units['purchase']?.['symbol'] || props['purchase_unit_'] || 'ק"ג';
        const bUnit = units['recipe']?.['symbol'] || props['uom'] || 'גרם';

        return {
          _id: item['_id'] || crypto.randomUUID(),
          name_hebrew: item['itemName'] || 'ללא שם',
          category_: props['topCategory'] || 'כללי',
          supplierId_: 'ספק כללי',
          purchase_price_: Number(props['gross_price_'] || props['purchasePrice'] || 0),
          purchase_unit_: pUnit as KitchenUnit,
          base_unit_: bUnit as KitchenUnit,
          conversion_factor_: Number(props['conversion_factor_'] || 1000),
          yield_factor_: Number(props['yieldFactor'] || (1 - (props['waste_percent_'] || 0) / 100)),
          allergens_: item['allergenIds'] || [],
          min_stock_level_: 0,
          is_dairy_: false,
          expiry_days_default_: 3
        };
      });

      this.kitchenStateService.products_.set(products);
    });
  }

  // LISTING
  protected filterCategories_ = computed(() => {
    const items = this.kitchenStateService.products_();
    const categories: Record<string, Set<string>> = {};

    items.forEach(item => {
      if (item.allergens_?.length) {
        if (!categories['Allergens']) categories['Allergens'] = new Set();
        item.allergens_.forEach(a => categories['Allergens'].add(a));
      }
      if (item.category_) {
        if (!categories['Category']) categories['Category'] = new Set();
        categories['Category'].add(item.category_);
      }
      if (item.supplierId_) {
        if (!categories['Supplier']) categories['Supplier'] = new Set();
        categories['Supplier'].add(item.supplierId_);
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

  protected filteredItems_ = computed(() => {
    const items = this.kitchenStateService.products_();
    const filters = this.activeFilters_();

    if (Object.keys(filters).length === 0) return items;

    return items.filter(item => {
      return Object.entries(filters).every(([category, selectedValues]) => {
        let itemValues: string[] = [];
        if (category === 'Allergens') itemValues = item.allergens_ || [];
        else if (category === 'Category') itemValues = item.category_ ? [item.category_] : [];
        else if (category === 'Supplier') itemValues = item.supplierId_ ? [item.supplierId_] : [];

        return selectedValues.some(v => itemValues.includes(v));
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
  protected onEditProduct(_id: string): void {
    this.router.navigate(['inventory', 'edit', _id]);
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