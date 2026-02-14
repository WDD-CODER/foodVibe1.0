import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';

@Component({
  selector: 'app-ingredient-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './ingredient-search.component.html',
  styleUrl: './ingredient-search.component.scss'
})
export class IngredientSearchComponent {
  private readonly state = inject(KitchenStateService);
  
  itemSelected = output<any>();
  searchQuery_ = signal<string>('');

  // Combine products and recipes for a unified search 
  protected filteredResults_ = computed(() => {
    const query = this.searchQuery_().toLowerCase();
    if (query.length < 2) return [];

    const products = this.state.products_().map(p => ({ ...p, item_type_: 'product' }));
    const recipes = this.state.recipes_().map(r => ({ ...r, item_type_: 'recipe' }));

    return [...products, ...recipes].filter(item => {
      return item.name_hebrew.toLowerCase().includes(query);
    }
    );
  });

  selectItem(item: any) {
    this.itemSelected.emit(item);
    this.searchQuery_.set('');
  }
}