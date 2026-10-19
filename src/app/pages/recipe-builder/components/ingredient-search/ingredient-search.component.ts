import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  output,
  input,
  viewChild,
  effect,
  untracked,
  ElementRef,
  Injector,
  afterNextRender
} from '@angular/core'
import { toObservable, toSignal } from '@angular/core/rxjs-interop'
import { debounceTime, map, switchMap } from 'rxjs'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { ProductDataService } from '@services/product-data.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { AddOptionRowComponent } from 'src/app/shared/add-option-row/add-option-row.component'
import { AddOptionLabel, addOptionLabel } from 'src/app/core/utils/add-option.util'
import { KeyedPickerSearch, scrollHighlightIntoView } from 'src/app/core/utils/keyed-picker-search.util'

/** Typeahead never needs more than what's visible in the dropdown. */
const SEARCH_LIMIT = 25
/** Matches preparation-search.component.ts's existing minimum — also avoids firing a request per single keystroke. */
const MIN_QUERY_LENGTH = 2
/** Matches the debounce window used elsewhere in the app for async lookups (recipe-builder.page.ts's duplicate-name validator). */
const SEARCH_DEBOUNCE_MS = 250

/** KeyedPickerSearch key — one picker per component instance. */
const PICKER_KEY = 0
/** Per-instance id prefix for option ids (aria-activedescendant). */
let nextIngredientSearchId = 0

/** Product or Recipe with item_type_ for search results and emit. */
export type SearchableItem = (Product | Recipe) & { item_type_: 'product' | 'recipe' }

@Component({
  selector: 'app-ingredient-search',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ClickOutSideDirective,
    ScrollableDropdownComponent,
    TranslatePipe,
    SelectOnFocusDirective,
    InputClearComponent,
    AddOptionRowComponent
  ],
  templateUrl: './ingredient-search.component.html',
  styleUrl: './ingredient-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngredientSearchComponent {
  private readonly productData = inject(ProductDataService)
  private readonly recipeData = inject(RecipeDataService)
  private readonly quickAddModalService = inject(QuickAddProductModalService)
  private readonly injector = inject(Injector)
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef)

  /** Row index for focus trigger; when focusTrigger matches this row, we focus. */
  rowIndex = input<number>(0)
  focusTrigger = input<number | null>(null)

  /** Names of ingredients already in the recipe; these are excluded from search results. */
  excludeNames = input<string[]>([])

  /** Optional initial search query (e.g. when editing an existing ingredient name). */
  initialQuery = input<string>('')

  itemSelected = output<SearchableItem>()
  focusDone = output<void>()
  /** Emit when user presses Enter in search with no selection (e.g. add new row). */
  addNewRowRequested = output<void>()
  /** Emit when user cancels (e.g. Escape) so parent can close edit mode. */
  cancelSearch = output<void>()

  protected searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput')
  searchQuery_ = signal<string>('')
  protected showResults_ = signal(false)
  /** Keyboard state (add-option rule 5): first option highlighted, no wrap, focus stays in the input. */
  private readonly picker_ = new KeyedPickerSearch()
  protected highlightedIndex_ = computed(() => this.picker_.highlighted(PICKER_KEY))
  protected readonly optionIdPrefix = `ing-search-${++nextIngredientSearchId}-opt-`

  private lastHandledFocusTrigger: number | null = null
  /** True for one microtask after the component is created — prevents the triggering click from immediately re-closing. */
  private ignoreFirstClickOutside = true

  constructor() {
    setTimeout(() => {
      this.ignoreFirstClickOutside = false
    }, 0)
    effect(() => {
      const trigger = this.focusTrigger()
      const row = this.rowIndex()
      if (trigger !== null && trigger === row && trigger !== this.lastHandledFocusTrigger) {
        this.lastHandledFocusTrigger = trigger
        setTimeout(() => this.focus(), 0)
        this.focusDone.emit()
      }
      if (trigger === null) this.lastHandledFocusTrigger = null
    })
    effect(() => {
      const q = this.initialQuery()?.trim() ?? ''
      if (q && !untracked(() => this.searchQuery_())) {
        this.searchQuery_.set(q)
        this.showResults_.set(true)
        setTimeout(() => this.focus(), 0)
      }
      if (q) this.picker_.setHighlighted(PICKER_KEY, 0)
    })
  }

  protected onClickOutside(): void {
    if (this.ignoreFirstClickOutside) return
    this.showResults_.set(false)
    this.picker_.setHighlighted(PICKER_KEY, 0)
    this.cancelSearch.emit()
  }

  /** Search clear (X): empty the field, close the results, keep focus in the field (plan 363). */
  protected onClearSearch(): void {
    this.searchQuery_.set('')
    this.showResults_.set(false)
    this.picker_.setHighlighted(PICKER_KEY, 0)
    this.focus()
  }

  /** Focus the search input (e.g. after adding a new row). */
  focus(): void {
    this.searchInputRef()?.nativeElement?.focus()
  }

  /**
   * Server-side prefix search (plan 301, Milestone 1) — debounced + cancels stale
   * in-flight requests via switchMap so fast typing doesn't fire one request per
   * keystroke or race an old query's results ahead of a newer one. Replaces the old
   * computed() that filtered the full in-memory products_()/recipes_() on every
   * keystroke, which got slow once a catalog reached 1,000+ docs.
   */
  private searchResults_ = toSignal(
    toObservable(this.searchQuery_).pipe(
      map((q) => (q ?? '').trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      switchMap((raw): Promise<SearchableItem[]> => {
        if (raw.length < MIN_QUERY_LENGTH) return Promise.resolve([])
        return Promise.all([
          this.productData.searchProducts(raw, SEARCH_LIMIT),
          this.recipeData.searchRecipes(raw, SEARCH_LIMIT)
        ]).then(([products, recipes]) => [
          ...products.map((p) => ({ ...p, item_type_: 'product' as const })),
          ...recipes.map((r) => ({ ...r, item_type_: 'recipe' as const }))
        ])
      })
    ),
    { initialValue: [] as SearchableItem[] }
  )

  // Exclude ingredients already in the recipe — layered as its own computed() so it
  // re-runs on excludeNames() changes without triggering a new network search.
  protected filteredResults_ = computed(() => {
    if ((this.searchQuery_() ?? '').trim().length < MIN_QUERY_LENGTH) return []
    const excludeSet = new Set((this.excludeNames() ?? []).map((n) => (n ?? '').trim().toLowerCase()).filter(Boolean))
    return this.searchResults_().filter((item) => !excludeSet.has((item.nameHebrew ?? '').trim().toLowerCase()))
  })

  /** One add option, last: `הוסף "<typed>"` for a new name, else `add_new_ingredient` (rules 1–3). */
  protected addLabel_ = computed<AddOptionLabel>(() =>
    addOptionLabel(this.searchQuery_(), this.searchResults_(), (item) => item.nameHebrew ?? '', 'add_new_ingredient')
  )

  protected onQueryInput(value: string): void {
    this.searchQuery_.set(value)
    this.showResults_.set(true)
    this.picker_.onQueryChange(PICKER_KEY, value)
  }

  protected onSearchFocus(): void {
    this.showResults_.set(true)
    this.picker_.setHighlighted(PICKER_KEY, 0)
  }

  selectItem(item: SearchableItem) {
    this.itemSelected.emit(item)
    this.searchQuery_.set('')
    this.showResults_.set(false)
    this.picker_.setHighlighted(PICKER_KEY, 0)
  }

  /** Rule 5 via KeyedPickerSearch; Enter with the list closed asks the parent for a new row. */
  protected onSearchKeydown(e: KeyboardEvent): void {
    const open = this.showResults_() && this.searchQuery_().trim().length > 0
    if (!open) {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.addNewRowRequested.emit()
      } else if (e.key === 'Escape') {
        this.cancelSearch.emit()
      }
      return
    }
    if (e.key === 'Tab') {
      this.showResults_.set(false)
      return
    }
    const results = this.filteredResults_()
    this.picker_.handleKeydown(PICKER_KEY, e, {
      optionCount: results.length + 1,
      onSelect: (idx) => {
        if (idx < results.length) this.selectItem(results[idx])
        else void this.addNewProduct()
      },
      onClose: () => {
        this.showResults_.set(false)
        this.cancelSearch.emit()
      },
      onHighlightMove: () =>
        afterNextRender(() => scrollHighlightIntoView(this.hostRef.nativeElement), { injector: this.injector })
    })
  }

  /** Add: a typed new name prefills the quick-add modal; the saved product is selected, nothing on cancel (rule 4). */
  protected async addNewProduct(): Promise<void> {
    const label = this.addLabel_()
    const product = await this.quickAddModalService.open({ prefillName: label.kind === 'typed' ? label.text : '' })
    if (!product) return
    this.selectItem({ ...product, item_type_: 'product' as const })
  }
}
