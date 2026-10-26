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
  untracked
} from '@angular/core'
import { toObservable, toSignal } from '@angular/core/rxjs-interop'
import { debounceTime, map, switchMap } from 'rxjs'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { ProductDataService } from '@services/product-data.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { SearchComboboxComponent } from 'src/app/shared/search-combobox/search-combobox.component'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'

/** Typeahead never needs more than what's visible in the dropdown. */
const SEARCH_LIMIT = 25
/** Matches preparation-search.component.ts's existing minimum — also avoids firing a request per single keystroke. */
const MIN_QUERY_LENGTH = 2
/** Matches the debounce window used elsewhere in the app for async lookups (recipe-builder.page.ts's duplicate-name validator). */
const SEARCH_DEBOUNCE_MS = 250

/** Product or Recipe with item_type_ for search results and emit. */
export type SearchableItem = (Product | Recipe) & { item_type_: 'product' | 'recipe' }

@Component({
  selector: 'app-ingredient-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, SearchComboboxComponent, TranslatePipe],
  templateUrl: './ingredient-search.component.html',
  styleUrl: './ingredient-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngredientSearchComponent {
  private readonly productData = inject(ProductDataService)
  private readonly recipeData = inject(RecipeDataService)
  private readonly quickAddModalService = inject(QuickAddProductModalService)

  /** Row index for focus trigger; when focusTrigger matches this row, we focus. */
  rowIndex = input<number>(0)
  focusTrigger = input<number | null>(null)

  /** Names of ingredients already in the recipe; these are excluded from search results. */
  excludeNames = input<string[]>([])

  /** Optional initial search query (e.g. when editing an existing ingredient name). */
  initialQuery = input<string>('')

  /**
   * Plan 490 — inventory products the row's name could mean (a not-ready pasted row). Listed first, marked as
   * suggestions, while the query is still the opening one; gone once the user types something else.
   */
  suggestions = input<readonly Product[]>([])

  itemSelected = output<SearchableItem>()
  focusDone = output<void>()
  /** Emit when user presses Enter in search with no selection (e.g. add new row). */
  addNewRowRequested = output<void>()
  /** Emit when user cancels (e.g. Escape) so parent can close edit mode. */
  cancelSearch = output<void>()

  protected searchBox_ = viewChild<SearchComboboxComponent<SearchableItem>>(SearchComboboxComponent)
  searchQuery_ = signal<string>('')
  protected shouldShowResults_ = signal(false)
  protected readonly itemLabel_ = (item: SearchableItem): string => item.nameHebrew ?? ''
  protected readonly itemKey_ = (item: SearchableItem): string => item.item_type_ + item._id

  private lastHandledFocusTrigger: number | null = null
  /** True for one microtask after the component is created — prevents the triggering click from immediately re-closing. */
  private shouldIgnoreFirstClickOutside = true

  constructor() {
    setTimeout(() => {
      this.shouldIgnoreFirstClickOutside = false
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
        this.shouldShowResults_.set(true)
        setTimeout(() => this.focus(), 0)
      }
    })
  }

  protected onClickOutside(): void {
    if (this.shouldIgnoreFirstClickOutside) return
    this.shouldShowResults_.set(false)
    this.cancelSearch.emit()
  }

  /** Focus the search input (e.g. after adding a new row). */
  focus(): void {
    this.searchBox_()?.focus()
  }

  /**
   * Server-side prefix search (plan 301, Milestone 1) — debounced + cancels stale
   * in-flight requests via switchMap so fast typing doesn't fire one request per
   * keystroke or race an old query's results ahead of a newer one. Replaces the old
   * computed() that filtered the full in-memory products_()/recipes_() on every
   * keystroke, which got slow once a catalog reached 1,000+ docs.
   */
  protected searchResults_ = toSignal(
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

  private readonly excludeSet_ = computed(
    () => new Set((this.excludeNames() ?? []).map((n) => (n ?? '').trim().toLowerCase()).filter(Boolean))
  )

  // Exclude ingredients already in the recipe — layered as its own computed() so it
  // re-runs on excludeNames() changes without triggering a new network search.
  protected filteredResults_ = computed(() => {
    if ((this.searchQuery_() ?? '').trim().length < MIN_QUERY_LENGTH) return []
    const excludeSet = this.excludeSet_()
    return this.searchResults_().filter((item) => !excludeSet.has((item.nameHebrew ?? '').trim().toLowerCase()))
  })

  /** Plan 490: the suggestions to list now — only while the query equals the opening query, minus excluded names. */
  protected readonly suggestionItems_ = computed<SearchableItem[]>(() => {
    const opening = (this.initialQuery() ?? '').trim()
    if (!opening || (this.searchQuery_() ?? '').trim() !== opening) return []
    const excludeSet = this.excludeSet_()
    return this.suggestions()
      .filter((p) => !excludeSet.has((p.nameHebrew ?? '').trim().toLowerCase()))
      .map((p) => ({ ...p, item_type_: 'product' as const }))
  })

  private readonly suggestionIds_ = computed(() => new Set(this.suggestionItems_().map((p) => p._id)))

  /** Suggestions first, then the server results without the same product. */
  protected readonly listedOptions_ = computed<SearchableItem[]>(() => {
    const suggested = this.suggestionItems_()
    if (suggested.length === 0) return this.filteredResults_()
    const ids = this.suggestionIds_()
    return [...suggested, ...this.filteredResults_().filter((r) => !(r.item_type_ === 'product' && ids.has(r._id)))]
  })

  /** What rule X compares against: an exact suggestion name hides the add row too. */
  protected readonly knownOptions_ = computed<SearchableItem[]>(() => [
    ...this.suggestionItems_(),
    ...this.searchResults_()
  ])

  protected isSuggestion_(item: SearchableItem): boolean {
    return item.item_type_ === 'product' && this.suggestionIds_().has(item._id)
  }

  selectItem(item: SearchableItem) {
    this.itemSelected.emit(item)
    this.searchQuery_.set('')
    this.shouldShowResults_.set(false)
  }

  /** Enter with the list closed asks the parent for a new row; Escape with it closed cancels the edit. */
  protected onSearchKeyUnhandled(e: KeyboardEvent): void {
    if (this.shouldShowResults_() && this.searchQuery_().trim()) return
    if (e.key === 'Enter') {
      e.preventDefault()
      this.addNewRowRequested.emit()
    } else if (e.key === 'Escape') {
      this.cancelSearch.emit()
    }
  }

  /** Add: a typed new name prefills the quick-add modal; the saved product is selected, nothing on cancel (rule 4). */
  protected async addNewProduct(typed: string): Promise<void> {
    const product = await this.quickAddModalService.open({ prefillName: typed })
    if (!product) return
    this.selectItem({ ...product, item_type_: 'product' as const })
  }
}
