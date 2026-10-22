import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { InventoryProductListComponent } from './inventory-product-list.component'
import { KitchenStateService } from '@services/kitchen-state.service'
import { Router, ActivatedRoute } from '@angular/router'
import { signal, computed } from '@angular/core'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { Product } from '@models/product.model'
import { TranslationService } from '@services/translation.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'

// Dictionary text for the in-use confirms (plan 458 moved them to dictionary keys).
const IN_USE_TEXT: Record<string, string> = {
  confirm_delete_product_in_use: 'חומר הגלם הזה בשימוש ב-{n} מתכונים/מנות. מחיקה תסיר אותו מכולם. להמשיך?',
  confirm_bulk_delete_products_in_use:
    '{inUse} מתוך {total} המוצרים שנבחרו בשימוש ב-{affected} מתכונים/מנות בסך הכל. מחיקה תסיר אותם מכולם. להמשיך?'
}

describe('InventoryProductListComponent', () => {
  let component: InventoryProductListComponent
  let fixture: ComponentFixture<InventoryProductListComponent>
  let mockRouter: jasmine.SpyObj<Router>

  const mockUnitRegistry = {
    allUnitKeys_: signal(['gram', 'kg', 'liter', 'unit']),
    getConversion: (key: string) => ({ gram: 1, kg: 1000, liter: 1000, ml: 1, unit: 1 })[key] ?? 1
  }

  beforeEach(async () => {
    const mockProductsSignal = signal<Product[]>([
      {
        _id: '1',
        nameHebrew: 'Tomato',
        categories: ['Vegetables'],
        sources: [{ supplierId: 'Supplier A', price: 5, addedAt: Date.now() }],
        allergens: ['Gluten'],
        baseUnit: 'gram'
      } as Product,
      {
        _id: '2',
        nameHebrew: 'Milk',
        categories: ['Dairy'],
        sources: [{ supplierId: 'Supplier B', price: 12, addedAt: Date.now() }],
        allergens: ['milk products'],
        baseUnit: 'liter'
      } as Product
    ])

    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'], {
      events: of(),
      url: of('')
    })
    mockRouter.createUrlTree.and.returnValue({} as any)
    mockRouter.serializeUrl.and.returnValue('')

    const mockSuppliersSignal = signal([
      { _id: 'Supplier A', nameHebrew: 'Supplier A' },
      { _id: 'Supplier B', nameHebrew: 'Supplier B' }
    ])
    const mockKitchenState = {
      products_: mockProductsSignal,
      suppliers_: mockSuppliersSignal,
      recipes_: signal([]),
      suppliersById_: computed(() => new Map(mockSuppliersSignal().map((s) => [s._id, s]))),
      deleteProduct: jasmine.createSpy('deleteProduct'),
      saveProduct: jasmine.createSpy('saveProduct').and.returnValue(Promise.resolve(undefined))
    }

    await TestBed.configureTestingModule({
      imports: [InventoryProductListComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: KitchenStateService, useValue: mockKitchenState },
        { provide: Router, useValue: mockRouter },
        {
          provide: RecipeDataService,
          useValue: { ensureLoaded: jasmine.createSpy('recipeEnsureLoaded').and.resolveTo() }
        },
        { provide: DishDataService, useValue: { ensureLoaded: jasmine.createSpy('dishEnsureLoaded').and.resolveTo() } },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}), params: of({}), snapshot: { queryParams: {}, params: {} } }
        },
        { provide: TranslationService, useValue: { translate: (k: string) => IN_USE_TEXT[k] ?? (k || '') } },
        { provide: UnitRegistryService, useValue: mockUnitRegistry },
        {
          provide: ConfirmModalService,
          useValue: { open: jasmine.createSpy('open').and.returnValue(Promise.resolve(true)) }
        }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(InventoryProductListComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should generate filter categories based on products in state', () => {
    const categories = (component as any).filterCategories_()
    const names = categories.map((c: any) => c.name)

    expect(names).toContain('Category')
    expect(names).toContain('Supplier')
    expect(names).toContain('Allergens')
  })

  it('the unpriced filter keeps only products with no price anywhere', () => {
    const state = TestBed.inject(KitchenStateService) as unknown as { products_: ReturnType<typeof signal<Product[]>> }
    state.products_.set([
      {
        _id: 'u',
        nameHebrew: 'Oil',
        categories: ['Pantry'],
        sources: [],
        purchaseOptions: [],
        allergens: [],
        baseUnit: 'liter'
      } as unknown as Product,
      {
        _id: 'c',
        nameHebrew: 'Salt',
        categories: [],
        sources: [{ supplierId: 'Supplier A', price: 3 }],
        purchaseOptions: [],
        allergens: [],
        baseUnit: 'kg'
      } as unknown as Product
    ])
    ;(component as any).searchQuery_.set('')
    ;(component as any).activeFilters_.set({})
    ;(component as any).shouldShowUnpricedOnly_.set(true)
    const results = (component as any).filteredProducts_() as Product[]
    expect(results.map((p) => p._id)).toEqual(['u'])
    const row = (component as any).displayRows_()[0]
    expect(row.unpriced).toBe(true)
  })

  it('should filter items when a filter is toggled', () => {
    // Ensure no state leaks from URL/list-state persistence.
    ;(component as any).searchQuery_.set('')
    ;(component as any).isLowStockOnly_.set(false)
    ;(component as any).activeFilters_.set({})

    ;(component as any).toggleFilter('Category', 'Dairy')
    fixture.detectChanges()

    const results = (component as any).filteredProducts_()
    expect(results.length).toBe(1)
    expect(results[0].nameHebrew).toBe('Milk')
  })

  it('should handle multiple filter categories (AND logic)', () => {
    ;(component as any).toggleFilter('Category', 'Vegetables')
    ;(component as any).toggleFilter('Allergens', 'Gluten')
    fixture.detectChanges()

    const results = (component as any).filteredProducts_()
    expect(results.length).toBe(1)
    expect(results[0].nameHebrew).toBe('Tomato')
  })

  it('shows the general category for a product with no category (plan 438)', () => {
    expect((component as any).getCategoryDisplay([])).toBe('category_general')
    expect((component as any).getCategoryDisplay(undefined)).toBe('category_general')
  })

  it('should navigate to edit page with correct absolute path', () => {
    // FIX: Aligning with Component's actual navigation logic
    component.onEditProduct('123')
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/edit', '123'])
  })

  it('should call deleteProduct on state service when confirmed', async () => {
    const confirmModal = TestBed.inject(ConfirmModalService)
    ;(confirmModal.open as jasmine.Spy).and.returnValue(Promise.resolve(true))
    const stateService = TestBed.inject(KitchenStateService)
    ;(stateService.deleteProduct as jasmine.Spy).and.returnValue(Promise.resolve())

    await (component as any).onDeleteProduct('1')
    expect(stateService.deleteProduct).toHaveBeenCalledWith('1')
  })

  describe('recipes not yet loaded (plan 420)', () => {
    let confirmOpen: jasmine.Spy
    let state: any
    let recipeData: { ensureLoaded: jasmine.Spy }
    let dishData: { ensureLoaded: jasmine.Spy }
    const usingRecipe = { _id: 'r1', ingredients: [{ referenceId: '1' }] }

    beforeEach(() => {
      confirmOpen = TestBed.inject(ConfirmModalService).open as jasmine.Spy
      confirmOpen.calls.reset()
      confirmOpen.and.returnValue(Promise.resolve(false))
      state = TestBed.inject(KitchenStateService)
      recipeData = TestBed.inject(RecipeDataService) as any
      dishData = TestBed.inject(DishDataService) as any
      recipeData.ensureLoaded.calls.reset()
      dishData.ensureLoaded.calls.reset()
      // Recipes appear in the list only once ensureLoaded has run (cold /inventory load).
      state.recipes_.set([])
      recipeData.ensureLoaded.and.callFake(async () => state.recipes_.set([usingRecipe]))
    })

    it('onDeleteProduct awaits ensureLoaded on recipes and dishes and the confirm text carries the count', async () => {
      await (component as any).onDeleteProduct('1')
      expect(recipeData.ensureLoaded).toHaveBeenCalledTimes(1)
      expect(dishData.ensureLoaded).toHaveBeenCalledTimes(1)
      expect(confirmOpen.calls.mostRecent().args[0]).toContain('ב-1 מתכונים/מנות')
    })

    it('onBulkDeleteSelected awaits ensureLoaded on recipes and dishes and the confirm text carries the count', async () => {
      await (component as any).onBulkDeleteSelected(['1', '2'])
      expect(recipeData.ensureLoaded).toHaveBeenCalledTimes(1)
      expect(dishData.ensureLoaded).toHaveBeenCalledTimes(1)
      expect(confirmOpen.calls.mostRecent().args[0]).toContain('ב-1 מתכונים/מנות')
    })

    it('stops the delete when the load fails', async () => {
      recipeData.ensureLoaded.and.rejectWith(new Error('load failed'))
      await (component as any).onDeleteProduct('1')
      await (component as any).onBulkDeleteSelected(['1'])
      expect(confirmOpen).not.toHaveBeenCalled()
    })
  })
  describe('one status mark per row (plan 462)', () => {
    const base = {
      nameHebrew: 'Item',
      categories: ['Pantry'],
      sources: [{ supplierId: 'Supplier A', price: 5 }],
      purchaseOptions: [],
      allergens: [],
      baseUnit: 'kg'
    }
    const setProducts = (...products: Record<string, unknown>[]): void => {
      const state = TestBed.inject(KitchenStateService) as unknown as {
        products_: ReturnType<typeof signal<Product[]>>
      }
      state.products_.set(products as unknown as Product[])
      ;(component as any).searchQuery_.set('')
      ;(component as any).activeFilters_.set({})
      fixture.detectChanges()
    }
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement
    const chips = (): string[] =>
      Array.from(root().querySelectorAll('.validation-tooltip .c-chip')).map((c) => c.textContent?.trim() ?? '')

    it('three gaps (price, category, supplier) render one amber chip mark with three chips and no triangle', () => {
      setProducts({ ...base, _id: 'a', categories: [], sources: [] })
      expect(root().querySelectorAll('.row-status').length).toBe(1)
      expect(root().querySelectorAll('.validation-badge--incomplete').length).toBe(0)
      expect(root().querySelectorAll('.validation-badge--unpriced').length).toBe(1)
      expect(root().querySelector('.row-status .unpriced-badge')).not.toBeNull()
      expect(chips()).toEqual(['missing_price', 'missing_category', 'missing_supplier'])
    })

    it('a priced product with no supplier renders one triangle mark with one chip', () => {
      setProducts({ ...base, _id: 'b', sources: [], buy_price_global_: 4 })
      expect(root().querySelectorAll('.row-status').length).toBe(1)
      expect(root().querySelectorAll('.validation-badge--incomplete').length).toBe(1)
      expect(root().querySelector('.row-status .unpriced-badge')).toBeNull()
      expect(chips()).toEqual(['missing_supplier'])
    })

    it('a complete product renders no mark', () => {
      setProducts({ ...base, _id: 'c' })
      expect(root().querySelectorAll('.row-status').length).toBe(0)
      expect(root().querySelectorAll('.validation-tooltip').length).toBe(0)
    })

    it('a product with no unit renders the red circle only, with a price chip when also unpriced', () => {
      setProducts({ ...base, _id: 'd', baseUnit: '', sources: [] })
      expect(root().querySelectorAll('.row-status').length).toBe(1)
      expect(root().querySelectorAll('.validation-badge--invalid').length).toBe(1)
      expect(root().querySelector('.row-status .unpriced-badge')).toBeNull()
      expect(chips()).toEqual(['missing_price', 'missing_unit', 'missing_supplier'])
    })

    it('keeps the filter results: invalid, incomplete and unpriced return the same products as before', () => {
      setProducts(
        { ...base, _id: 'inv', baseUnit: '' },
        { ...base, _id: 'inc', categories: [] },
        { ...base, _id: 'unp', sources: [{ supplierId: 'Supplier A', price: 0 }] },
        { ...base, _id: 'ok' }
      )
      const c = component as any
      c.shouldShowInvalidOnly_.set(true)
      expect(c.filteredProducts_().map((p: Product) => p._id)).toEqual(['inv'])
      c.shouldShowInvalidOnly_.set(false)
      c.shouldShowIncompleteOnly_.set(true)
      expect(c.filteredProducts_().map((p: Product) => p._id)).toEqual(['inc'])
      c.shouldShowIncompleteOnly_.set(false)
      c.shouldShowUnpricedOnly_.set(true)
      expect(c.filteredProducts_().map((p: Product) => p._id)).toEqual(['unp'])
    })

    it('a tap on the mark opens the box without opening the edit page; a second tap closes it', () => {
      setProducts({ ...base, _id: 'a', sources: [] })
      mockRouter.navigate.calls.reset()
      const btn = root().querySelector<HTMLButtonElement>('.row-status') as HTMLButtonElement
      btn.click()
      fixture.detectChanges()
      expect(btn.getAttribute('aria-expanded')).toBe('true')
      expect(mockRouter.navigate).not.toHaveBeenCalled()
      btn.click()
      fixture.detectChanges()
      expect(btn.getAttribute('aria-expanded')).toBe('false')
      expect(mockRouter.navigate).not.toHaveBeenCalled()
    })

    it('a tap outside and Escape close the box; a tap in the box does not open the edit page', () => {
      setProducts({ ...base, _id: 'a', sources: [] })
      mockRouter.navigate.calls.reset()
      const btn = root().querySelector<HTMLButtonElement>('.row-status') as HTMLButtonElement
      btn.click()
      fixture.detectChanges()
      root().querySelector<HTMLElement>('.validation-tooltip')?.click()
      expect(mockRouter.navigate).not.toHaveBeenCalled()
      document.body.click()
      fixture.detectChanges()
      expect(btn.getAttribute('aria-expanded')).toBe('false')
      btn.click()
      fixture.detectChanges()
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      fixture.detectChanges()
      expect(btn.getAttribute('aria-expanded')).toBe('false')
    })

    it('a tap on the product name still opens the edit page', () => {
      setProducts({ ...base, _id: 'a', sources: [] })
      mockRouter.navigate.calls.reset()
      root().querySelector<HTMLElement>('.product-grid-row .col-name')?.click()
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/edit', 'a'])
    })
  })
})
