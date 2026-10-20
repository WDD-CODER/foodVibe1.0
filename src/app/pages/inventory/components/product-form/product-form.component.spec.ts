import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { ReactiveFormsModule } from '@angular/forms'
import { ProductFormComponent } from './product-form.component'
import { ConversionService } from '@services/conversion.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { UtilService } from '@services/util.service'
import { UserMsgService } from '@services/user-msg.service'
import { ActivatedRoute, Router } from '@angular/router'
import { of, Subject, take, takeUntil } from 'rxjs'
import { signal, computed } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { Product } from '@models/product.model'
import { TranslationService } from '@services/translation.service'
import { TranslationKeyModalService } from '@services/translation-key-modal.service'
import { AddSupplierFlowService } from '@services/add-supplier-flow.service'

describe('ProductFormComponent', () => {
  let component: ProductFormComponent
  let fixture: ComponentFixture<ProductFormComponent>
  let mockRouter: jasmine.SpyObj<Router>
  let mockConversionService: jasmine.SpyObj<ConversionService>
  let mockUnitRegistry: jasmine.SpyObj<UnitRegistryService>
  // Same semantics as UnitRegistryService.awaitUnitCreated: one saved unit, nothing after the window closes.
  let unitAdded$: Subject<string>
  let creatorClosed$: Subject<void>

  // Signal Mocks for SoT
  const mockCategories = signal(['meat', 'dairy'])
  const mockAllergens = signal(['gluten', 'peanuts'])
  const mockUnitKeys = signal(['ק"ג', 'גרם'])
  const mockIsCreatorOpen = signal(false) // Add this signal mock
  const mockSuppliersSignal = signal<{ _id: string; nameHebrew: string }[]>([])
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'])
    mockConversionService = jasmine.createSpyObj('ConversionService', [
      'handleWasteChange',
      'handleYieldChange',
      'getSuggestedPurchasePrice'
    ])
    mockConversionService.handleWasteChange.and.returnValue({ yieldFactor: 1 })
    mockConversionService.handleYieldChange.and.returnValue({ wastePercent: 0 })
    mockConversionService.getSuggestedPurchasePrice.and.returnValue(0)
    unitAdded$ = new Subject<string>()
    creatorClosed$ = new Subject<void>()
    mockUnitRegistry = jasmine.createSpyObj(
      'UnitRegistryService',
      ['getConversion', 'openUnitCreator', 'refreshFromStorage', 'awaitUnitCreated'],
      {
        allUnitKeys_: mockUnitKeys,
        isCreatorOpen_: mockIsCreatorOpen,
        unitAdded$
      }
    )
    mockUnitRegistry.refreshFromStorage.and.returnValue(Promise.resolve())
    mockUnitRegistry.awaitUnitCreated.and.callFake(() => unitAdded$.pipe(take(1), takeUntil(creatorClosed$)))

    const mockMetadata = jasmine.createSpyObj('MetadataRegistryService', ['registerCategory'], {
      allCategories_: mockCategories,
      allAllergens_: mockAllergens
    })

    const mockUtil = jasmine.createSpyObj('UtilService', ['getEmptyProduct'])
    mockUtil.getEmptyProduct.and.returnValue({
      _id: '',
      nameHebrew: '',
      baseUnit: 'gram',
      categories: [],
      sources: [],
      purchaseOptions: [],
      yieldFactor: 1,
      allergens: [],
      minStockLevel: 0,
      expiryDaysDefault: 0
    } as Product)

    await TestBed.configureTestingModule({
      imports: [ProductFormComponent, ReactiveFormsModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: ConversionService, useValue: mockConversionService },
        { provide: UnitRegistryService, useValue: mockUnitRegistry },
        { provide: MetadataRegistryService, useValue: mockMetadata },
        { provide: UtilService, useValue: mockUtil },
        { provide: UserMsgService, useValue: {} },
        {
          provide: KitchenStateService,
          useValue: {
            saveProduct: () => of(null),
            products_: signal<Product[]>([]),
            suppliers_: mockSuppliersSignal,
            suppliersById_: computed(() => new Map(mockSuppliersSignal().map((s) => [s._id, s])))
          }
        },
        {
          provide: ActivatedRoute,
          useValue: { data: of({ product: null }), params: of({}) }
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
        { provide: TranslationKeyModalService, useValue: { open: () => Promise.resolve(null) } },
        { provide: AddSupplierFlowService, useValue: { open: () => Promise.resolve(null) } }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(ProductFormComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  describe('Form Logic: Waste & Yield Sync', () => {
    it('should update yield_factor when waste_percent changes', () => {
      mockConversionService.handleWasteChange.and.returnValue({ yieldFactor: 0.8 })

      const wasteCtrl = component['productForm_'].get('waste_percent_')
      wasteCtrl?.setValue(20)

      expect(component['productForm_'].get('yieldFactor')?.value).toBe(0.8)
    })
  })

  describe('Computed Calculations', () => {
    it('should calculate netUnitCost_ reactively from form values', fakeAsync(() => {
      // Set initial form state
      component['productForm_'].patchValue({
        buy_price_global_: 100,
        yieldFactor: 0.8
      })

      tick() // Let valueChanges stream through toSignal
      fixture.detectChanges()

      // Formula in code: price / yieldFactor => 100 / 0.8 = 125
      expect((component as any).netUnitCost_()).toBe(125)
    }))
  })

  describe('Dynamic Purchase Options', () => {
    it('should add a new purchase option and sync suggested price on unit change', () => {
      // 1. Setup the global price
      component['productForm_'].patchValue({ buy_price_global_: 10 })

      // 2. Configure the EXISTING spies instead of re-creating the object
      mockUnitRegistry.getConversion.and.returnValue(1000)
      mockConversionService.getSuggestedPurchasePrice.and.returnValue(10000)

      // 3. Act
      ;(component as any).addPurchaseOption()
      const options = component.purchaseOptions_
      const firstRow = options.at(0)

      // 4. Trigger unit change - this calls getConversion and getSuggestedPurchasePrice
      firstRow.get('unitSymbol')?.setValue('kg')

      // 5. Assert — conversionRate = base units per 1 purchase unit; kg/kg => 1
      expect(firstRow.get('conversionRate')?.value).toBe(1)
      expect(firstRow.get('priceOverride')?.value).toBe(10000)
    })
  })

  // Plan 377 — an auto-filled price must not be saved as a special price.
  describe('Special purchase price on save', () => {
    it('saves priceOverride only for rows with "special price" ticked', async () => {
      const kitchen = TestBed.inject(KitchenStateService)
      const saveSpy = spyOn(kitchen, 'saveProduct').and.returnValue(of(null as unknown as Product))
      const form = component['productForm_']
      form.patchValue({ productName: 'בצל', baseUnit: 'kg', buy_price_global_: 10, categories: ['vegetables'] })
      const add = (component as unknown as { addPurchaseOption: (o: object) => void }).addPurchaseOption.bind(component)
      add({ unitSymbol: 'jar', conversionRate: 0.5, uom: 'kg' })
      add({ unitSymbol: 'box', conversionRate: 2, uom: 'kg', priceOverride: 7 })
      // The auto-filled price the row keeps while "special price" is off.
      component.purchaseOptions_.at(0).patchValue({ priceOverride: 10 }, { emitEvent: false })

      expect(await component.saveAndWait()).toBe(true)
      const saved = saveSpy.calls.mostRecent().args[0] as Product
      expect(saved.purchaseOptions.map((o) => o.priceOverride)).toEqual([0, 7])
    })
  })

  describe('Add a unit from a dropdown (plan 418)', () => {
    it('opens the unit window with the typed name', () => {
      component['pendingAddName_'].set('צנצנת')
      component['onBaseUnitValueChange']('NEW_UNIT')
      expect(mockUnitRegistry.openUnitCreator).toHaveBeenCalledWith({ prefillName: 'צנצנת' })
      expect(component['pendingAddName_']()).toBe('')
    })

    it('fills the base unit with the unit saved in the window', () => {
      component['onBaseUnitValueChange']('NEW_UNIT')
      unitAdded$.next('jar')
      expect(component['productForm_'].get('baseUnit')?.value).toBe('jar')
    })

    it('after a cancel, a unit added later elsewhere does not fill the cancelled field', () => {
      component['addPurchaseOption']()
      component['onBaseUnitValueChange']('NEW_UNIT')
      creatorClosed$.next() // cancel
      component['onUomValueChange']('NEW_UNIT', 0)
      unitAdded$.next('jar')
      expect(component['productForm_'].get('baseUnit')?.value).toBe('')
      expect(component.purchaseOptions_.at(0).get('uom')?.value).toBe('jar')
    })
  })

  describe('Allergen Management', () => {
    it('should toggle allergens in the form control', () => {
      const ctrl = component['productForm_'].get('allergens')
      ;(component as any).toggleAllergen('gluten')
      expect(ctrl?.value).toContain('gluten')
      ;(component as any).toggleAllergen('gluten')
      expect(ctrl?.value).not.toContain('gluten')
    })
  })
})
