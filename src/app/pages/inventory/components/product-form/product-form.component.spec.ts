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
import { firstValueFrom, of, Subject, take, takeUntil } from 'rxjs'
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
  // Same semantics as UnitRegistryService.awaitUnitCreated: one saved unit, null once the window closes.
  let unitSaved$: Subject<string>
  let productUnitSaved$: Subject<{ key: string; amount: number; basis: string }>
  let windowClosed$: Subject<void>

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
    unitSaved$ = new Subject<string>()
    windowClosed$ = new Subject<void>()
    productUnitSaved$ = new Subject<{ key: string; amount: number; basis: string }>()
    mockUnitRegistry = jasmine.createSpyObj(
      'UnitRegistryService',
      ['getConversion', 'openUnitCreator', 'refreshFromStorage', 'awaitUnitCreated', 'awaitProductUnitAdded'],
      {
        allUnitKeys_: mockUnitKeys,
        isCreatorOpen_: mockIsCreatorOpen
      }
    )
    mockUnitRegistry.refreshFromStorage.and.returnValue(Promise.resolve())
    mockUnitRegistry.awaitUnitCreated.and.callFake(() =>
      firstValueFrom(unitSaved$.pipe(take(1), takeUntil(windowClosed$)), { defaultValue: null })
    )
    mockUnitRegistry.awaitProductUnitAdded.and.callFake(() =>
      firstValueFrom(productUnitSaved$.pipe(take(1), takeUntil(windowClosed$)), { defaultValue: null })
    )

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
            saveProduct: () => Promise.resolve(null),
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
      expect(component['netUnitCost_']()).toBe(125)
    }))

    it('keeps the net cost when the price control is disabled (staff price lock)', fakeAsync(() => {
      component['productForm_'].patchValue({ buy_price_global_: 12, yieldFactor: 1 })
      component['productForm_'].get('buy_price_global_')!.disable({ emitEvent: false })

      component['productForm_'].patchValue({ yieldFactor: 0.5 })
      tick()

      expect(component['netUnitCost_']()).toBe(24)
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
      const saveSpy = spyOn(kitchen, 'saveProduct').and.returnValue(Promise.resolve(null as unknown as Product))
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

  // Plan 438 — a product needs a name and a base unit, nothing else.
  describe('Lean entry (plan 438)', () => {
    it('saves with only a name and a base unit', async () => {
      const kitchen = TestBed.inject(KitchenStateService)
      const saveSpy = spyOn(kitchen, 'saveProduct').and.returnValue(Promise.resolve(null as unknown as Product))
      component['productForm_'].patchValue({ productName: 'בצל ירוק', baseUnit: 'kg', buy_price_global_: null })
      expect(await component.saveAndWait()).toBe(true)
      const saved = saveSpy.calls.mostRecent().args[0] as Product
      expect(saved.sources).toEqual([])
      expect(saved.categories).toEqual([])
      expect(saved.yieldFactor).toBe(1)
    })

    it('an empty name fails with field_name_required', async () => {
      ;(TestBed.inject(UserMsgService) as unknown as { onSetErrorMsg: () => void }).onSetErrorMsg = () => undefined
      component['productForm_'].patchValue({ productName: '', baseUnit: 'kg' })
      expect(await component.saveAndWait()).toBe(false)
      const errors = component['validationErrors_']()
      expect(errors['productName']).toBe('field_name_required')
      expect(errors['buy_price_global_']).toBeUndefined()
      expect(errors['categories']).toBeUndefined()
    })

    it('no base unit fails with field_unit_required', async () => {
      ;(TestBed.inject(UserMsgService) as unknown as { onSetErrorMsg: () => void }).onSetErrorMsg = () => undefined
      component['productForm_'].patchValue({ productName: 'בצל ירוק', baseUnit: '' })
      expect(await component.saveAndWait()).toBe(false)
      const errors = component['validationErrors_']()
      expect(errors['baseUnit']).toBe('field_unit_required')
      expect(errors['buy_price_global_']).toBeUndefined()
      expect(errors['categories']).toBeUndefined()
    })
  })

  describe('Add a unit from a dropdown (plan 418)', () => {
    it('opens the unit window with the typed name', () => {
      component['pendingAddName_'].set('צנצנת')
      component['onBaseUnitValueChange']('NEW_UNIT')
      expect(mockUnitRegistry.openUnitCreator).toHaveBeenCalledWith({ prefillName: 'צנצנת' })
      expect(component['pendingAddName_']()).toBe('')
    })

    it('fills the base unit with the unit saved in the window', fakeAsync(() => {
      component['onBaseUnitValueChange']('NEW_UNIT')
      unitSaved$.next('jar')
      tick()
      expect(component['productForm_'].get('baseUnit')?.value).toBe('jar')
    }))

    it('after a cancel, a unit added later elsewhere does not fill the cancelled field', fakeAsync(() => {
      component['addPurchaseOption']()
      component['onBaseUnitValueChange']('NEW_UNIT')
      windowClosed$.next() // cancel
      tick()
      component['onUomValueChange']('NEW_UNIT', 0)
      unitSaved$.next('jar')
      tick()
      expect(component['productForm_'].get('baseUnit')?.value).toBe('kg') // restored, a string
      expect(component.purchaseOptions_.at(0).get('uom')?.value).toBe('jar')
    }))
  })

  // Plan 423 - a purchase unit's weight belongs to the product it is added to.
  describe('Purchase units carry this product own weight (plan 423)', () => {
    const rowAt = (i: number) => component.purchaseOptions_.at(i)

    beforeEach(() => {
      mockUnitRegistry.getConversion.and.callFake((k: string) => ({ kg: 1000, gram: 1, jar: 500 })[k] ?? 1)
      component['productForm_'].patchValue({ productName: 'חמוצים', baseUnit: 'kg' })
    })

    it('choosing an existing custom unit leaves the amount empty and compares to the base unit', () => {
      component['addPurchaseOption']()
      rowAt(0).get('unitSymbol')?.setValue('jar')
      expect(rowAt(0).get('conversionRate')?.value).toBeNull()
      expect(rowAt(0).get('uom')?.value).toBe('kg')
    })

    it('choosing a system unit fills the exact amount', () => {
      component['addPurchaseOption']()
      rowAt(0).get('unitSymbol')?.setValue('gram')
      expect(rowAt(0).get('conversionRate')?.value).toBe(0.001)
      rowAt(0).get('unitSymbol')?.setValue('kg')
      expect(rowAt(0).get('conversionRate')?.value).toBe(1)
    })

    it('add new unit opens the window in product mode with the product name and base unit', () => {
      component['addPurchaseOption']()
      component['onUnitSymbolValueChange']('NEW_UNIT', 0)
      expect(mockUnitRegistry.openUnitCreator).toHaveBeenCalledWith(
        jasmine.objectContaining({ forProduct: { name: 'חמוצים', baseUnit: 'kg' } })
      )
    })

    it('add new unit then add: the row holds the typed amount, its basis and the new key', fakeAsync(() => {
      component['addPurchaseOption']()
      component['onUnitSymbolValueChange']('NEW_UNIT', 0)
      productUnitSaved$.next({ key: 'jar', amount: 350, basis: 'gram' })
      tick()
      expect(rowAt(0).value).toEqual(jasmine.objectContaining({ unitSymbol: 'jar', conversionRate: 350, uom: 'gram' }))
    }))

    it('add new unit then cancel: the row keeps its previous unit, amount and basis (strings, not numbers)', fakeAsync(() => {
      component['addPurchaseOption']({ unitSymbol: 'gram', conversionRate: 1, uom: 'gram' })
      rowAt(0).get('unitSymbol')?.setValue('NEW_UNIT')
      component['onUnitSymbolValueChange']('NEW_UNIT', 0)
      expect(rowAt(0).get('unitSymbol')?.value).toBe('')
      windowClosed$.next() // cancel
      tick()
      expect(rowAt(0).get('unitSymbol')?.value).toBe('gram')
      expect(rowAt(0).get('conversionRate')?.value).toBe(1)
      expect(rowAt(0).get('uom')?.value).toBe('gram')
    }))

    it('base unit: add new unit then cancel keeps what it showed; then add selects the new unit', fakeAsync(() => {
      component['onBaseUnitValueChange']('NEW_UNIT')
      expect(component['productForm_'].get('baseUnit')?.value).toBe('')
      windowClosed$.next()
      tick()
      expect(component['productForm_'].get('baseUnit')?.value).toBe('kg')
      component['onBaseUnitValueChange']('NEW_UNIT')
      unitSaved$.next('crate')
      tick()
      expect(component['productForm_'].get('baseUnit')?.value).toBe('crate')
    }))
  })

  describe('Plan 461 - purchase row and failed save', () => {
    const rowEl = (sel: string) => (fixture.nativeElement as HTMLElement).querySelector(sel)

    it('a new purchase row shows only the unit box until a unit is chosen', () => {
      component['addPurchaseOption']()
      fixture.detectChanges()
      expect(rowEl('.row-unit')).not.toBeNull()
      expect(rowEl('.row-qty')).toBeNull()
      expect(rowEl('.row-uom')).toBeNull()
      expect(rowEl('.price-override-wrapper')).toBeNull()
      expect(rowEl('.row-del')).not.toBeNull()
      component['purchaseOptions_'].at(0).get('unitSymbol')?.setValue('gram')
      fixture.detectChanges()
      expect(rowEl('.row-qty')).not.toBeNull()
      expect(rowEl('.row-uom')).not.toBeNull()
      expect(rowEl('.price-override-wrapper')).not.toBeNull()
    })

    it('a failed save names the invalid fields, stays on the page and marks the rows', async () => {
      const onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
      component['userMsgService'].onSetErrorMsg = onSetErrorMsg
      component['addPurchaseOption']()
      const saved = await component.saveAndWait()
      expect(saved).toBeFalse()
      expect(onSetErrorMsg).toHaveBeenCalledWith('form_has_errors_fields')
      expect(component.isSubmitted).toBeTrue()
    })

    it('the name box shows the duplicate message when the name is taken', () => {
      const name = component['productForm_'].get('productName')
      name?.setValue('עגבניה')
      name?.setErrors({ duplicateName: true })
      name?.markAsDirty()
      fixture.detectChanges()
      expect((fixture.nativeElement as HTMLElement).querySelector('.c-field-error')?.textContent?.trim()).toBe(
        'duplicate_product_name_error'
      )
      expect((fixture.nativeElement as HTMLElement).querySelector('input.c-input--invalid')).not.toBeNull()
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
