import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy,
  WritableSignal
} from '@angular/core'
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, NavigationEnd } from '@angular/router'
import { filter, debounceTime, map, switchMap } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'

import { KitchenStateService } from '@services/kitchen-state.service'
import { ProductDataService } from '@services/product-data.service'
import { HeroFabService } from '@services/hero-fab.service'
import { AiRecipeModalService } from 'src/app/shared/ai-recipe-modal/ai-recipe-modal.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { TranslationService } from '@services/translation.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { UserService } from '@services/user.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { Recipe } from '@models/recipe.model'
import { Product } from '@models/product.model'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state'
import { TouchRowSelection } from 'src/app/shared/list-selection/touch-row-selection'
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component'
import { SelectionBarComponent } from 'src/app/shared/selection-bar/selection-bar.component'
import { BulkEditableField } from 'src/app/shared/selection-bar/bulk-editable-field.model'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import {
  useListState,
  StringParam,
  NullableStringParam,
  FilterRecordParam,
  StringArrayParam,
  BooleanParam,
  NumberParam
} from 'src/app/core/utils/list-state.util'
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
import { resolveRecipeAllergens } from 'src/app/core/utils/recipe-allergens.util'
import { CellExpandState } from 'src/app/core/utils/cell-expand-state.util'
import { useCollapsibleCategories } from 'src/app/core/utils/collapsible-categories.util'
import { buildFilterOptionCounts, attachFilterCheckedState } from 'src/app/core/utils/filter-category-counts.util'
import { RatingStarsComponent } from 'src/app/shared/rating-stars/rating-stars.component'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'
import { COLUMN_CAROUSEL } from 'src/app/shared/column-carousel'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import {
  SortField,
  RECIPE_FILTER_CATEGORIES,
  isRecipeDish,
  getAllRecipeLabels,
  categoryDisplayKey,
  filterOptionLabel,
  recipeFilterValues,
  parseDateToStartOfDay,
  parseDateToEndOfDay,
  formatShortDate,
  formatDateTime,
  recipeContainsAllProducts,
  compareRecipes
} from './utils/recipe-book-list.util'
import { RecipeRowActionsService } from './services/recipe-row-actions.service'
import { RecipeListTooltipsService } from './services/recipe-list-tooltips.service'

/** Ingredient-filter typeahead search (plan 301, Milestone 1) — same tuning as ingredient-search.component.ts. */
const INGREDIENT_SEARCH_LIMIT = 25
const INGREDIENT_SEARCH_MIN_LENGTH = 2
const INGREDIENT_SEARCH_DEBOUNCE_MS = 250

@Component({
  selector: 'recipe-book-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ClickOutSideDirective,
    LoaderComponent,
    ScrollableDropdownComponent,
    ListShellComponent,
    ListRowCheckboxComponent,
    SelectionBarComponent,
    EmptyStateComponent,
    RatingStarsComponent,
    RowActionsMenuComponent,
    ...COLUMN_CAROUSEL,
    InputClearComponent
  ],
  providers: [RecipeRowActionsService, RecipeListTooltipsService],
  templateUrl: './recipe-book-list.component.html',
  styleUrl: './recipe-book-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeBookListComponent implements OnInit, OnDestroy {
  // 1. INJECTED
  protected readonly kitchenState = inject(KitchenStateService)
  private readonly productData = inject(ProductDataService)
  private readonly router = inject(Router)
  private readonly recipeCostService = inject(RecipeCostService)
  private readonly translationService = inject(TranslationService)
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly userService = inject(UserService)
  private readonly heroFab = inject(HeroFabService)
  private readonly aiRecipeModal = inject(AiRecipeModalService)
  protected readonly rowActions = inject(RecipeRowActionsService)
  protected readonly tooltips = inject(RecipeListTooltipsService)

  // 4. SIGNALS & CONSTANTS
  protected readonly isLoggedIn = this.userService.isLoggedIn
  protected readonly isAdmin_ = this.userService.isAdmin_
  protected activeFilters_ = signal<Record<string, string[]>>({})
  protected searchQuery_ = signal<string>('')
  protected sortBy_ = signal<SortField | null>(null)
  protected sortOrder_ = signal<'asc' | 'desc'>('asc')
  protected readonly isPanelOpen_: WritableSignal<boolean>
  private readonly togglePanelState_: () => void
  protected dateFrom_ = signal<string | null>(null)
  protected dateTo_ = signal<string | null>(null)
  protected showFavoritesOnly_ = signal<boolean>(false)
  /** When true: show items in range by creation OR by update. When false: by creation only. */
  protected dateIncludeByUpdated_ = signal<boolean>(false)
  protected ingredientSearchQuery_ = signal<string>('')
  protected selectedProductIds_ = signal<string[]>([])
  /** Set to false to show the "date added" column again. */
  protected hideDateColumn_ = signal(true)

  /** Filter-category open state (plan 345): all collapsed on mobile (≤1023px). On desktop every
   *  group starts expanded except 'Date', which the mockup doesn't show — it stays collapsed so it
   *  doesn't dominate the panel above the categories the design leads with. */
  protected readonly filterCategories = useCollapsibleCategories({ desktopCollapsed: ['Date'] })
  protected readonly allergenExpand = new CellExpandState()
  protected readonly labelsExpand = new CellExpandState()
  protected selection = new ListSelectionState()
  protected touchSelect = new TouchRowSelection({ selection: this.selection, historyKey: 'recipeSelection' })

  // Pagination (plan 304 M3) — this list has no virtualisation-compatible row/cell markup
  // (shared .c-list-row engine class uses `display: contents` so its cells flow directly
  // into the table-body grid; cdk-virtual-scroll's item wrapper would break that column
  // alignment across every list page using the same shared class). Slicing displayRows_()
  // to a page gets the same DOM-size win — fewer rendered grid cells — without touching
  // the shared engine CSS at all.
  protected readonly PAGE_SIZE = 50
  protected readonly currentPage_ = signal(1)

  /** Pure helpers the template calls directly (plan 399 utils). */
  protected readonly isRecipeDish = isRecipeDish
  protected readonly formatAddedAt = formatShortDate
  protected readonly formatUpdatedAtWithTime = formatDateTime

  // 5. COMPUTED
  protected readonly currentUserId_ = computed(() => this.userService.user_()?._id ?? null)

  protected editableFields_ = computed<BulkEditableField[]>(() => [
    {
      key: 'labels',
      label: 'labels',
      options: this.metadataRegistry.allLabels_().map((l) => ({ value: l.key, label: l.key })),
      multi: true
    },
    {
      key: 'recipeType',
      label: 'recipe_type',
      options: [
        { value: 'dish', label: 'dish' },
        { value: 'preparation', label: 'preparation' }
      ],
      multi: false
    }
  ])

  // Catalog-only pass — recomputes when the recipe list changes, NOT on every
  // filter-checkbox toggle (see filter-category-counts.util.ts).
  private filterOptionCounts_ = computed(() => {
    const recipes = this.kitchenState.recipes_()
    const counts = buildFilterOptionCounts(recipes, (recipe, bump) => {
      const allergens = this.getRecipeAllergens(recipe)
      RECIPE_FILTER_CATEGORIES.forEach((category) =>
        recipeFilterValues(recipe, category, allergens).forEach((value) => bump(category, value))
      )
    })

    // Always show both Approved options (כן/לא), even at 0, so the sidebar can show
    // selected state when filtering by URL.
    if (!counts['Approved']) counts['Approved'] = new Map()
    if (!counts['Approved'].has('true')) counts['Approved'].set('true', 0)
    if (!counts['Approved'].has('false')) counts['Approved'].set('false', 0)

    return counts
  })

  // Filters-only pass — cheap, bounded by option count, not catalog size.
  protected filterCategories_ = computed(() =>
    attachFilterCheckedState(
      this.filterOptionCounts_(),
      this.activeFilters_(),
      categoryDisplayKey,
      filterOptionLabel,
      (name, value) => (name === 'Labels' && value !== 'no_label' ? this.getLabelColor(value) : null)
    )
  )

  /**
   * Server-side prefix search (plan 301, Milestone 1) — debounced + cancels stale
   * in-flight requests via switchMap. Replaces filtering the full in-memory
   * kitchenState.products_() on every keystroke, which got slow once a catalog
   * reached 1,000+ docs (same fix as ingredient-search.component.ts).
   */
  private ingredientSearchResults_ = toSignal(
    toObservable(this.ingredientSearchQuery_).pipe(
      map((q) => (q ?? '').trim()),
      debounceTime(INGREDIENT_SEARCH_DEBOUNCE_MS),
      switchMap((raw): Promise<Product[]> =>
        raw.length < INGREDIENT_SEARCH_MIN_LENGTH
          ? Promise.resolve([])
          : this.productData.searchProducts(raw, INGREDIENT_SEARCH_LIMIT)
      )
    ),
    { initialValue: [] as Product[] }
  )

  // Exclude already-selected products — layered as its own computed() so it re-runs on
  // selectedProductIds_() changes without triggering a new network search.
  protected filteredProductsForIngredientSearch_ = computed(() => {
    if (this.ingredientSearchQuery_().trim().length < INGREDIENT_SEARCH_MIN_LENGTH) return []
    const selected = new Set(this.selectedProductIds_())
    return this.ingredientSearchResults_().filter((p) => !selected.has(p._id))
  })

  protected filteredRecipes_ = computed(() => {
    let recipes = this.kitchenState.recipes_()
    const filters = this.activeFilters_()
    const search = this.searchQuery_().trim().toLowerCase()
    const sortBy = this.sortBy_()
    const sortOrder = this.sortOrder_()
    const selectedIds = this.selectedProductIds_()

    if (Object.keys(filters).length > 0) {
      recipes = recipes.filter((recipe) => {
        return Object.entries(filters).every(([category, selectedValues]) => {
          if (category === 'Allergens') {
            // "Do not include allergens": show only recipes that have NONE of the selected allergens
            const allergens = this.getRecipeAllergens(recipe)
            return selectedValues.every((v) => !allergens.includes(v))
          }
          const recipeValues = recipeFilterValues(recipe, category, [])
          return selectedValues.some((v) => recipeValues.includes(v))
        })
      })
    }

    if (selectedIds.length > 0) {
      const recipesById = this.kitchenState.recipesById_()
      recipes = recipes.filter((r) => recipeContainsAllProducts(r, selectedIds, recipesById))
    }

    if (search) {
      recipes = recipes.filter((r) => (r.nameHebrew ?? '').toLowerCase().includes(search))
    }

    const dateFrom = this.dateFrom_()
    const dateTo = this.dateTo_()
    const includeByUpdated = this.dateIncludeByUpdated_()
    if (dateFrom != null || dateTo != null) {
      const fromMs = dateFrom != null ? parseDateToStartOfDay(dateFrom) : null
      const toMs = dateTo != null ? parseDateToEndOfDay(dateTo) : null
      recipes = recipes.filter((recipe) => {
        const inRange = (ts: number) => {
          if (fromMs != null && ts < fromMs) return false
          if (toMs != null && ts > toMs) return false
          return true
        }
        const createdInRange = inRange(recipe.createdAt ?? 0)
        const updatedInRange = includeByUpdated && inRange(recipe.updatedAt ?? 0)
        return createdInRange || updatedInRange
      })
    }

    if (this.showFavoritesOnly_()) {
      const uid = this.currentUserId_()
      recipes = uid ? recipes.filter((r) => (r.favoritedBy ?? []).includes(uid)) : []
    }

    if (sortBy) {
      const isAsc = sortOrder === 'asc'
      const deps = {
        translate: (key: string) => this.translationService.translate(key),
        cost: (r: Recipe) => this.getRecipeCost(r),
        allergens: (r: Recipe) => this.getRecipeAllergens(r)
      }
      recipes = [...recipes].sort((a, b) => {
        const cmp = compareRecipes(a, b, sortBy, deps)
        return isAsc ? cmp : -cmp
      })
    }

    return recipes
  })

  /** Visible recipe IDs for header select-all. */
  protected filteredRecipeIds_ = computed(() =>
    this.filteredRecipes_()
      .map((r) => r._id ?? '')
      .filter(Boolean)
  )

  /**
   * Precomputed per-row values (plan 303 M2). getAllRecipeLabels/getRecipeAllergens/getRecipeCost
   * are cheap after the M1 Map lookups, but the template still called them 2-3x per row on every
   * change-detection pass (every click/keystroke/scroll). This derives each row's display values
   * once per data change instead, so the template just reads plain properties.
   */
  protected readonly displayRows_ = computed(() =>
    this.filteredRecipes_().map((recipe) => ({
      recipe,
      labels: getAllRecipeLabels(recipe),
      allergens: this.getRecipeAllergens(recipe),
      cost: this.getRecipeCost(recipe)
    }))
  )

  protected readonly totalPages_ = computed(() => Math.max(1, Math.ceil(this.displayRows_().length / this.PAGE_SIZE)))
  /** Clamped so an out-of-range page (e.g. after a filter shrinks the result set) self-corrects. */
  protected readonly displayPage_ = computed(() => Math.min(this.currentPage_(), this.totalPages_()))
  protected readonly pagedRows_ = computed(() => {
    const start = (this.displayPage_() - 1) * this.PAGE_SIZE
    return this.displayRows_().slice(start, start + this.PAGE_SIZE)
  })
  protected readonly pageIndicatorText_ = computed(() =>
    this.translationService
      .translate('page_indicator')
      .replace('{n}', String(this.displayPage_()))
      .replace('{m}', String(this.totalPages_()))
  )

  protected isEmptyList_ = computed(() => this.kitchenState.recipes_().length === 0)

  protected activeCostTooltipRecipe_ = computed(() => {
    const id = this.tooltips.costHoveredId() ?? this.tooltips.costTappedId()
    return id ? (this.filteredRecipes_().find((r) => r._id === id) ?? null) : null
  })

  protected activeDateTooltipRecipe_ = computed(() => {
    const id = this.tooltips.dateHoveredId()
    return id ? (this.filteredRecipes_().find((r) => r._id === id) ?? null) : null
  })

  protected hasActiveFilters_ = computed(
    () =>
      Object.values(this.activeFilters_()).some((arr) => arr.length > 0) ||
      this.dateFrom_() != null ||
      this.dateTo_() != null ||
      this.showFavoritesOnly_() ||
      this.selectedProductIds_().length > 0
  )

  constructor() {
    const panel = useResponsivePanelState('recipe-book')
    this.isPanelOpen_ = panel.isPanelOpen_
    this.togglePanelState_ = panel.togglePanel

    useListState('recipe-book', [
      { urlParam: 'q', signal: this.searchQuery_, serializer: StringParam },
      { urlParam: 'sort', signal: this.sortBy_, serializer: NullableStringParam },
      { urlParam: 'order', signal: this.sortOrder_, serializer: StringParam },
      { urlParam: 'filters', signal: this.activeFilters_, serializer: FilterRecordParam },
      { urlParam: 'ingredients', signal: this.selectedProductIds_, serializer: StringArrayParam },
      { urlParam: 'dateFrom', signal: this.dateFrom_, serializer: NullableStringParam },
      { urlParam: 'dateTo', signal: this.dateTo_, serializer: NullableStringParam },
      { urlParam: 'dateByUpdated', signal: this.dateIncludeByUpdated_, serializer: BooleanParam },
      { urlParam: 'favorites', signal: this.showFavoritesOnly_, serializer: BooleanParam },
      { urlParam: 'page', signal: this.currentPage_, serializer: NumberParam }
    ])

    // Open any filter category that gains a selected value (e.g. when opened via URL like
    // ?filters=Approved:false) — categories start collapsed on mobile and Date starts collapsed
    // on desktop (plan 345). Only newly-active names are opened, so a category the user
    // collapses again stays closed while they keep filtering elsewhere.
    let prevActive = new Set<string>()
    effect(() => {
      const filters = this.activeFilters_()
      const active = new Set(Object.keys(filters).filter((name) => (filters[name]?.length ?? 0) > 0))
      if (this.dateFrom_() != null || this.dateTo_() != null) active.add('Date')
      active.forEach((name) => {
        if (!prevActive.has(name)) this.filterCategories.expandIfActive(name, true)
      })
      prevActive = active
    })

    // Pagination (plan 304 M3): jump back to page 1 whenever the filtered/sorted result
    // set changes, so a search/filter doesn't strand the user on a now-irrelevant page.
    // Skips its first run so a page restored from the URL/session (e.g. navigating back
    // from a recipe) isn't immediately stomped back to 1.
    let skipFirstPageReset = true
    effect(() => {
      this.filteredRecipeIds_()
      if (skipFirstPageReset) {
        skipFirstPageReset = false
        return
      }
      this.currentPage_.set(1)
    })

    // Reset expanded allergen/labels cells when user lands on recipe-book list (e.g. navigates back).
    const events = this.router.events
    if (events) {
      events
        .pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          takeUntilDestroyed()
        )
        .subscribe(() => {
          if (this.router.url.includes('recipe-book')) this.resetExpandedCells()
        })
    }
  }

  ngOnInit(): void {
    this.heroFab.setPageActions(
      [
        {
          labelKey: 'add_recipe_ai',
          icon: 'sparkles',
          run: () => {
            void this.aiRecipeModal.open()
          }
        }
      ],
      'replace'
    )
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions()
  }

  // 6. METHODS — Read
  /** Resolves label color by registry key, or by display text (e.g. Hebrew) when recipe stores translated value. */
  protected getLabelColor(keyOrDisplay: string): string {
    const byKey = this.metadataRegistry.getLabelColor(keyOrDisplay)
    if (byKey !== '#78716C') return byKey
    const byDisplay = this.metadataRegistry
      .allLabels_()
      .find((def) => this.translationService.translate(def.key) === keyOrDisplay)
    return byDisplay?.color ?? byKey
  }

  protected getRecipeAllergens(recipe: Recipe): string[] {
    return resolveRecipeAllergens(recipe, this.kitchenState.recipesById_(), this.kitchenState.productsById_())
  }

  protected getRecipeCost(recipe: Recipe): number {
    return this.recipeCostService.computeRecipeCost(recipe)
  }

  protected getRecipeYieldDescription(recipe: Recipe): string {
    const amount = recipe.yieldAmount ?? 1
    const unit = recipe.yieldUnit ? this.translationService.translate(recipe.yieldUnit) : ''
    return `${amount} ${unit}`.trim() || String(amount)
  }

  protected isFavoritedByCurrentUser_(recipe: Recipe): boolean {
    const uid = this.currentUserId_()
    if (!uid) return false
    return (recipe.favoritedBy ?? []).includes(uid)
  }

  protected getSelectedProducts(): Product[] {
    const ids = this.selectedProductIds_()
    return this.kitchenState.products_().filter((p) => ids.includes(p._id))
  }

  protected selectedCountInCategory(category: { options: { checked_: boolean }[] }): number {
    return category.options.filter((o) => o.checked_).length
  }

  // Delete
  protected async onBulkDeleteSelected(ids: string[]): Promise<void> {
    if (await this.rowActions.bulkDelete(ids)) this.selection.clear()
  }

  // UI handlers — navigation
  protected onAddRecipe(): void {
    this.router.navigate(['/recipe-builder'])
  }

  protected onEditRecipe(recipe: Recipe): void {
    this.router.navigate(['/recipe-builder', recipe._id])
  }

  protected onCookRecipe(recipe: Recipe): void {
    this.router.navigate(['/cook', recipe._id])
  }

  protected onRowClick(recipe: Recipe, event: MouseEvent): void {
    if (this.touchSelect.consumeClick()) return
    const el = event.target as HTMLElement
    if (
      el.closest('button') ||
      el.closest('a') ||
      el.closest('.cost-cell-wrap') ||
      el.closest('.allergen-btn-wrapper') ||
      el.closest('.labels-btn-wrapper') ||
      el.closest('app-list-row-checkbox')
    )
      return
    if (this.selection.selectionMode()) {
      this.selection.toggle(recipe._id ?? '')
      return
    }
    if (this.isLoggedIn()) {
      this.onEditRecipe(recipe)
    } else {
      this.onCookRecipe(recipe)
    }
  }

  // UI handlers — sort, filters, search, panel, paging
  protected setSort(field: SortField): void {
    const current = this.sortBy_()
    if (current === field) {
      this.sortOrder_.update((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      this.sortBy_.set(field)
      this.sortOrder_.set('asc')
    }
  }

  /** Set sort to date (newest first). */
  protected setSortDateNewestFirst(): void {
    this.sortBy_.set('dateAdded')
    this.sortOrder_.set('desc')
  }

  /** Set sort to date (oldest first). */
  protected setSortDateOldestFirst(): void {
    this.sortBy_.set('dateAdded')
    this.sortOrder_.set('asc')
  }

  protected toggleFilter(categoryName: string, optionValue: string): void {
    this.activeFilters_.update((prev) => {
      const current = { ...prev }
      const values = current[categoryName] || []
      if (values.includes(optionValue)) {
        current[categoryName] = values.filter((v) => v !== optionValue)
        if (current[categoryName].length === 0) delete current[categoryName]
      } else {
        current[categoryName] = [...values, optionValue]
      }
      return current
    })
  }

  protected clearAllFilters(): void {
    this.activeFilters_.set({})
    this.dateFrom_.set(null)
    this.dateTo_.set(null)
    this.dateIncludeByUpdated_.set(false)
    this.showFavoritesOnly_.set(false)
    this.selectedProductIds_.set([])
  }

  protected toggleFilterCategory(name: string): void {
    this.filterCategories.toggle(name)
  }

  protected isCategoryExpanded(name: string): boolean {
    return this.filterCategories.isExpanded(name)
  }

  protected togglePanel(): void {
    this.togglePanelState_()
  }

  protected addIngredientProduct(product: Product): void {
    if (this.selectedProductIds_().includes(product._id)) return
    this.selectedProductIds_.update((ids) => [...ids, product._id])
    this.ingredientSearchQuery_.set('')
  }

  protected removeIngredientProduct(productId: string): void {
    this.selectedProductIds_.update((ids) => ids.filter((id) => id !== productId))
  }

  protected clearIngredientProducts(): void {
    this.selectedProductIds_.set([])
  }

  /** Search clear (X) — same effect as deleting the text; keeps focus in the field (plan 363). */
  protected onClearSearch(input: HTMLInputElement): void {
    this.searchQuery_.set('')
    input.focus()
  }

  /** Escape in a non-empty search clears it, like the X (plan 363). */
  protected onSearchEscape(event: Event, input: HTMLInputElement): void {
    if (!this.searchQuery_()) return
    event.preventDefault()
    event.stopPropagation()
    this.onClearSearch(input)
  }

  protected goToPrevPage(): void {
    this.currentPage_.update((p) => Math.max(1, p - 1))
  }

  protected goToNextPage(): void {
    this.currentPage_.update((p) => Math.min(this.totalPages_(), p + 1))
  }

  // UI handlers — expanded chip cells
  /** Close allergen chips view on outside click — guard header column clicks. */
  protected closeAllergenView(clickTarget?: EventTarget | null): void {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null
    if (el?.closest('.table-header .col-allergens')) return
    this.allergenExpand.closeAll()
  }

  /** Close labels chips view on outside click — guard header column clicks. */
  protected closeLabelsView(clickTarget?: EventTarget | null): void {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null
    if (el?.closest('.table-header .col-labels')) return
    this.labelsExpand.closeAll()
  }

  private resetExpandedCells(): void {
    this.allergenExpand.reset()
    this.labelsExpand.reset()
  }
}
