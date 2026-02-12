import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { ProductDataService } from '@services/product-data.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Router } from '@angular/router';

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
    this.router.navigate(['/inventory/edit', _id])
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