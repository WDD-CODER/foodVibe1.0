import { ComponentFixture, TestBed } from '@angular/core/testing'
import { InventoryProductListComponent } from './inventory-product-list.component'
import { KitchenStateService } from '@services/kitchen-state.service'
import { Router, ActivatedRoute } from '@angular/router'
import { signal } from '@angular/core'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { Product } from '@models/product.model'
import { TranslationService } from '@services/translation.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { ConfirmModalService } from '@services/confirm-modal.service'

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
        name_hebrew: 'Tomato',
        categories_: ['Vegetables'],
        sources_: [{ supplierId: 'Supplier A', price: 5, addedAt: Date.now() }],
        allergens_: ['Gluten'],
        base_unit_: 'gram'
      } as Product,
      {
        _id: '2',
        name_hebrew: 'Milk',
        categories_: ['Dairy'],
        sources_: [{ supplierId: 'Supplier B', price: 12, addedAt: Date.now() }],
        allergens_: ['milk products'],
        base_unit_: 'liter'
      } as Product
    ])

    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'], {
      events: of(),
      url: of('')
    })
    mockRouter.createUrlTree.and.returnValue({} as any)
    mockRouter.serializeUrl.and.returnValue('')

    const mockSuppliersSignal = signal([
      { _id: 'Supplier A', name_hebrew: 'Supplier A' },
      { _id: 'Supplier B', name_hebrew: 'Supplier B' }
    ])
    const mockKitchenState = {
      products_: mockProductsSignal,
      suppliers_: mockSuppliersSignal,
      deleteProduct: jasmine.createSpy('deleteProduct'),
      saveProduct: jasmine.createSpy('saveProduct').and.returnValue({ subscribe: () => {} })
    }

    await TestBed.configureTestingModule({
      imports: [InventoryProductListComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: KitchenStateService, useValue: mockKitchenState },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}), params: of({}), snapshot: { queryParams: {}, params: {} } }
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
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

  it('should filter items when a filter is toggled', () => {
    // Ensure no state leaks from URL/list-state persistence.
    ;(component as any).searchQuery_.set('')
    ;(component as any).lowStockOnly_.set(false)
    ;(component as any).activeFilters_.set({})

    ;(component as any).toggleFilter('Category', 'Dairy')
    fixture.detectChanges()

    const results = (component as any).filteredProducts_()
    expect(results.length).toBe(1)
    expect(results[0].name_hebrew).toBe('Milk')
  })

  it('should handle multiple filter categories (AND logic)', () => {
    ;(component as any).toggleFilter('Category', 'Vegetables')
    ;(component as any).toggleFilter('Allergens', 'Gluten')
    fixture.detectChanges()

    const results = (component as any).filteredProducts_()
    expect(results.length).toBe(1)
    expect(results[0].name_hebrew).toBe('Tomato')
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
    ;(stateService.deleteProduct as jasmine.Spy).and.returnValue({ subscribe: () => {} })

    await (component as any).onDeleteProduct('1')
    expect(stateService.deleteProduct).toHaveBeenCalledWith('1')
  })
})
