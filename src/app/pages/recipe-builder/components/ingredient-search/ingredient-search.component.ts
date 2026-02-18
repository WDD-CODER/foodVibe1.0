import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { ClickOutSideDirective } from '@directives/click-out-side';

@Component({
  selector: 'app-ingredient-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClickOutSideDirective],
  templateUrl: './ingredient-search.component.html',
  styleUrl: './ingredient-search.component.scss'
})
export class IngredientSearchComponent {
  private readonly state = inject(KitchenStateService);
  
  itemSelected = output<any>();
  searchQuery_ = signal<string>('');
  protected showResults_ = signal(false);

  // Combine products and recipes for a unified search
  protected filteredResults_ = computed(() => {
    const query = (this.searchQuery_() ?? '').trim().toLowerCase();
    if (!query) return [];

    const products = this.state.products_().map(p => ({ ...p, item_type_: 'product' }));
    const recipes = this.state.recipes_().map(r => ({ ...r, item_type_: 'recipe' }));

    return [...products, ...recipes].filter(item => {
      const name = (item.name_hebrew ?? '').toLowerCase();
      return name.includes(query);
    });
  });

  selectItem(item: any) {
    this.itemSelected.emit(item);
    this.searchQuery_.set('');
    this.showResults_.set(false);
  }
}