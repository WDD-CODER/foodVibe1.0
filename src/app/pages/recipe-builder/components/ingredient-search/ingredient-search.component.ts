import { Component, inject, signal, computed, output, input, viewChild, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { filterOptionsByStartsWith } from 'src/app/core/utils/filter-starts-with.util';
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service';
import type { Product } from '@models/product.model';
import type { Recipe } from '@models/recipe.model';

/** Product or Recipe with item_type_ for search results and emit. */
export type SearchableItem = (Product | Recipe) & { item_type_: 'product' | 'recipe' };

@Component({
  selector: 'app-ingredient-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, ScrollableDropdownComponent, TranslatePipe, SelectOnFocusDirective],
  templateUrl: './ingredient-search.component.html',
  styleUrl: './ingredient-search.component.scss'
})
export class IngredientSearchComponent {
  private readonly state = inject(KitchenStateService);
  private readonly quickAddModalService = inject(QuickAddProductModalService);

  /** Row index for focus trigger; when focusTrigger matches this row, we focus. */
  rowIndex = input<number>(0);
  focusTrigger = input<number | null>(null);

  /** Names of ingredients already in the recipe; these are excluded from search results. */
  excludeNames = input<string[]>([]);

  /** Optional initial search query (e.g. when editing an existing ingredient name). */
  initialQuery = input<string>('');

  itemSelected = output<SearchableItem>();
  focusDone = output<void>();
  /** Emit when user presses Enter in search with no selection (e.g. add new row). */
  addNewRowRequested = output<void>();
  /** Emit when user cancels (e.g. Escape) so parent can close edit mode. */
  cancelSearch = output<void>();

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
    effect(() => {
      const q = this.initialQuery()?.trim() ?? '';
      if (q && !this.searchQuery_()) {
        this.searchQuery_.set(q);
        this.showResults_.set(true);
        setTimeout(() => this.focus(), 0);
      }
      if (q) this.highlightedIndex_.set(-1);
    });
  }

  /** Focus the search input (e.g. after adding a new row). */
  focus(): void {
    this.searchInputRef()?.nativeElement?.focus();
  }

  // Combine products and recipes; exclude ingredients already in the recipe; filter by "starts with" + script
  protected filteredResults_ = computed(() => {
    const raw = (this.searchQuery_() ?? '').trim();
    if (!raw) return [];

    const excludeSet = new Set(
      (this.excludeNames() ?? []).map(n => (n ?? '').trim().toLowerCase()).filter(Boolean)
    );

    const products = this.state.products_().map(p => ({ ...p, item_type_: 'product' as const }));
    const recipes = this.state.recipes_().map(r => ({ ...r, item_type_: 'recipe' as const }));
    const candidates = [...products, ...recipes].filter(
      (item) => !excludeSet.has((item.name_hebrew ?? '').trim().toLowerCase())
    );
    return filterOptionsByStartsWith(candidates, raw, (item) => (item.name_hebrew ?? '').trim());
  });

  selectItem(item: SearchableItem) {
    this.itemSelected.emit(item);
    this.searchQuery_.set('');
    this.showResults_.set(false);
    this.highlightedIndex_.set(-1);
  }

  protected onSearchKeydown(e: KeyboardEvent) {
    const results = this.filteredResults_();
    const addItemIndex = results.length;
    const key = e.key;

    if (key === 'Enter') {
      const idx = this.highlightedIndex_();
      if (idx === addItemIndex || (results.length === 0 && idx < 0)) {
        e.preventDefault();
        this.addNewProduct();
        return;
      }
      if (results.length > 0) {
        e.preventDefault();
        this.selectItem(results[idx < 0 ? 0 : idx]);
        return;
      }
      e.preventDefault();
      this.addNewRowRequested.emit();
      return;
    }

    if (key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex_.update(i => (i < 0 ? 0 : (i < addItemIndex ? i + 1 : 0)));
      this.scrollHighlightedIntoView();
      return;
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex_.update(i => (i <= 0 ? addItemIndex : i - 1));
      this.scrollHighlightedIntoView();
      return;
    }
    if (key === 'Escape') {
      this.showResults_.set(false);
      this.highlightedIndex_.set(-1);
      this.cancelSearch.emit();
    }
  }

  protected async addNewProduct(): Promise<void> {
    const product = await this.quickAddModalService.open({ prefillName: this.searchQuery_() });
    if (!product) return;
    this.selectItem({ ...product, item_type_: 'product' as const });
  }

  protected onSearchTab(e: Event): void {
    if ((e as KeyboardEvent).shiftKey) return;
    if (!this.showResults_()) return;
    if (this.filteredResults_().length === 0) return;
    e.preventDefault();
    const first = document.querySelector<HTMLElement>('.result-item');
    first?.focus();
  }

  protected onResultItemKeydown(e: KeyboardEvent, index: number): void {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const allItems = Array.from(document.querySelectorAll<HTMLElement>('.result-item'));
    if (e.shiftKey) {
      const prev = allItems[index - 1];
      if (prev) {
        prev.focus();
      } else {
        this.showResults_.set(false);
        this.searchInputRef()?.nativeElement?.focus();
      }
    } else {
      const next = allItems[index + 1];
      if (next) {
        next.focus();
      } else {
        this.showResults_.set(false);
        this.searchInputRef()?.nativeElement?.focus();
      }
    }
  }

  protected onAddItemKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const allItems = Array.from(document.querySelectorAll<HTMLElement>('.result-item'));
    if (e.shiftKey) {
      const prev = allItems[allItems.length - 2];
      if (prev) {
        prev.focus();
      } else {
        this.searchInputRef()?.nativeElement?.focus();
      }
    } else {
      this.showResults_.set(false);
      this.searchInputRef()?.nativeElement?.focus();
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