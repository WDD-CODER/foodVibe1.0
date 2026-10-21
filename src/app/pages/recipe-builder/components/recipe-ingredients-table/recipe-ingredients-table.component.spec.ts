import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { RecipeIngredientsTableComponent } from './recipe-ingredients-table.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import { Product } from '@models/product.model'
import { ProductUnitAdded } from '@services/unit-registry.service'

describe('RecipeIngredientsTableComponent', () => {
  let component: RecipeIngredientsTableComponent
  let fixture: ComponentFixture<RecipeIngredientsTableComponent>
  let fb: FormBuilder

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeIngredientsTableComponent, ReactiveFormsModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [FormBuilder, provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()

    fb = TestBed.inject(FormBuilder)
    const ingredientsFormArray = fb.array([
      fb.group({
        amount_net: [0],
        nameHebrew: [''],
        referenceId: [''],
        item_type_: ['product'],
        unit: ['gram'],
        priceOverride: [null]
      })
    ])

    fixture = TestBed.createComponent(RecipeIngredientsTableComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('ingredientsFormArray', ingredientsFormArray)
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  // Plan 423 - a unit added from a recipe line weighs what the chef typed for THIS product.
  describe('add unit from a line (plan 423)', () => {
    const product = {
      _id: 'p1',
      nameHebrew: 'חמוצים',
      baseUnit: 'kg',
      purchaseOptions: [{ unitSymbol: 'box', conversionRate: 2, uom: 'kg' }]
    } as unknown as Product

    function lineGroup() {
      return fb.group({
        amount_net: [1],
        referenceId: ['p1'],
        item_type: ['product'],
        unit: [''],
        priceOverride: [null]
      })
    }

    it('opens the unit window in product mode and saves the typed amount on the product', fakeAsync(() => {
      const registry = TestBed.inject(UnitRegistryService)
      const open = spyOn(registry, 'openUnitCreator')
      let deliver!: (added: ProductUnitAdded | null) => void
      spyOn(registry, 'awaitProductUnitAdded').and.returnValue(new Promise((resolve) => (deliver = resolve)))
      const save = spyOn(TestBed.inject(KitchenStateService), 'saveProduct').and.returnValue(Promise.resolve(product))
      spyOn(component, 'getItemMetadata').and.returnValue(product)
      spyOn(component, 'updateLineCalculations')
      const group = lineGroup()

      component.onUnitChange(group, 0, '__add_unit__')
      tick()
      expect(open).toHaveBeenCalledWith(
        jasmine.objectContaining({ forProduct: { name: 'חמוצים', baseUnit: 'kg' }, existingUnitSymbols: ['box'] })
      )

      deliver({ key: 'jar', amount: 350, basis: 'gram' })
      tick()
      const saved = save.calls.mostRecent().args[0] as Product
      expect(saved.purchaseOptions.at(-1)).toEqual({
        unitSymbol: 'jar',
        conversionRate: 350,
        uom: 'gram',
        priceOverride: 0
      })
      expect(group.get('unit')?.value).toBe('jar')
    }))

    it('never reads the shared rate: a registry rate of 500 g for the unit does not reach the product', fakeAsync(() => {
      const registry = TestBed.inject(UnitRegistryService)
      spyOn(registry, 'openUnitCreator')
      const getConversion = spyOn(registry, 'getConversion').and.returnValue(500)
      let deliver!: (added: ProductUnitAdded | null) => void
      spyOn(registry, 'awaitProductUnitAdded').and.returnValue(new Promise((resolve) => (deliver = resolve)))
      const save = spyOn(TestBed.inject(KitchenStateService), 'saveProduct').and.returnValue(Promise.resolve(product))
      spyOn(component, 'getItemMetadata').and.returnValue(product)
      spyOn(component, 'updateLineCalculations')

      component.onUnitChange(lineGroup(), 0, '__add_unit__')
      tick()
      deliver({ key: 'jar', amount: 350, basis: 'gram' })
      tick()
      expect((save.calls.mostRecent().args[0] as Product).purchaseOptions.at(-1)?.conversionRate).toBe(350)
      expect(getConversion).not.toHaveBeenCalled()
    }))
  })

  // Plan 439 - pasted ingredient lines become rows; a line that cannot be read stays as a red "not ready" row.
  describe('paste ingredients (plan 439)', () => {
    const products = [
      { _id: 'p1', nameHebrew: 'עגבניות', baseUnit: 'kg' },
      { _id: 'p2', nameHebrew: 'מלח', baseUnit: 'kg' }
    ] as unknown as Product[]
    const rows = () => component.ingredientsFormArray().controls

    beforeEach(() => {
      spyOn(TestBed.inject(KitchenStateService), 'products_').and.returnValue(products)
      spyOn(TestBed.inject(TranslationService), 'resolveUnit').and.callFake((t: string) =>
        t === 'גרם' ? 'gram' : null
      )
      spyOn(component, 'updateLineCalculations')
    })

    it('adds one row per line, links known products, keeps the unreadable line as unlinked text', () => {
      component.onPasteIngredients('2 ק"ג עגבניות\n200 גרם מלח\nקצת פטרוזיליה')
      expect(rows().length).toBe(3)
      expect(rows()[0].get('referenceId')?.value).toBe('p1')
      expect(rows()[0].get('amount_net')?.value).toBe(2)
      expect(rows()[0].get('unit')?.value).toBe('kg')
      expect(rows()[1].get('referenceId')?.value).toBe('p2')
      expect(rows()[1].get('unit')?.value).toBe('gram')
      const third = rows()[2] as FormGroup
      expect(third.get('nameHebrew')?.value).toBe('קצת פטרוזיליה')
      expect(third.get('referenceId')?.value).toBeFalsy()
      expect((component as unknown as { isUnlinkedRow: (g: FormGroup) => boolean }).isUnlinkedRow(third)).toBeTrue()
      expect(third.valid).toBeTrue()
    })

    it('replaces the empty trailing row instead of keeping it', () => {
      expect(rows().length).toBe(1)
      component.onPasteIngredients('3 ביצים')
      expect(rows().length).toBe(1)
      expect(rows()[0].get('nameHebrew')?.value).toBe('ביצים')
    })

    it('appends after rows that already have content', () => {
      component.onPasteIngredients('3 ביצים')
      component.onPasteIngredients('1 גרם מלח')
      expect(rows().length).toBe(2)
    })

    it('does nothing for blank text', () => {
      component.onPasteIngredients('  \n ')
      expect(rows().length).toBe(1)
    })
  })
})
