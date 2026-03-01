import { Component, inject, signal, computed, output, input, viewChild, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';

@Component({
  selector: 'app-ingredient-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, ScrollableDropdownComponent],
  templateUrl: './ingredient-search.component.html',
  styleUrl: './ingredient-search.component.scss'
})
export class IngredientSearchComponent {
  private readonly state = inject(KitchenStateService);

  /** Row index for focus trigger; when focusTrigger matches this row, we focus. */
  rowIndex = input<number>(0);
  focusTrigger = input<number | null>(null);

  itemSelected = output<any>();
  focusDone = output<void>();
  /** Emit when user presses Enter in search with no selection (e.g. add new row). */
  addNewRowRequested = output<void>();

  protected searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  searchQuery_ = signal<string>('');
  protected showResults_ = signal(false);
  /** Index of highlighted option for keyboard nav (-1 = none). */
  protected highlightedIndex_ = signal(-1);

  private lastHandledFocusTrigger: number | null = null;

  constructor() {
    effect(() => {
      const trigger = this.focusTrigger();
      const row = this.rowIndex();
      if (trigger !== null && trigger === row && trigger !== this.lastHandledFocusTrigger) {
        this.lastHandledFocusTrigger = trigger;
        setTimeout(() => this.focus(), 0);
        this.focusDone.emit();
      }
      if (trigger === null) this.lastHandledFocusTrigger = null;
    });
  }

  /** Focus the search input (e.g. after adding a new row). */
  focus(): void {
    this.searchInputRef()?.nativeElement?.focus();
  }

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
    this.highlightedIndex_.set(-1);
  }

  protected onSearchKeydown(e: KeyboardEvent) {
    const results = this.filteredResults_();
    if (results.length === 0) return;

    const key = e.key;
    if (key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex_.update(i => (i < 0 ? 0 : (i < results.length - 1 ? i + 1 : 0)));
      this.scrollHighlightedIntoView();
      return;
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex_.update(i => (i <= 0 ? results.length - 1 : i - 1));
      this.scrollHighlightedIntoView();
      return;
    }
    if (key === 'Enter') {
      let idx = this.highlightedIndex_();
      if (results.length > 0) {
        if (idx < 0) idx = 0;
        e.preventDefault();
        this.selectItem(results[idx]);
      } else {
        e.preventDefault();
        this.addNewRowRequested.emit();
      }
      return;
    }
    if (key === 'Escape') {
      this.showResults_.set(false);
      this.highlightedIndex_.set(-1);
    }
  }

  private scrollHighlightedIntoView(): void {
    setTimeout(() => {
      const list = document.querySelector('.c-dropdown__list');
      const highlighted = list?.querySelector('.result-item.highlighted');
      highlighted?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }
}