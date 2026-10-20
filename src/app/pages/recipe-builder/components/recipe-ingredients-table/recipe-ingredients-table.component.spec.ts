import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { RecipeIngredientsTableComponent } from './recipe-ingredients-table.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { Product } from '@models/product.model'
import { of } from 'rxjs'

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
      const save = spyOn(TestBed.inject(KitchenStateService), 'saveProduct').and.returnValue(of(product))
      spyOn(component, 'getItemMetadata').and.returnValue(product)
      spyOn(component, 'updateLineCalculations')
      const group = lineGroup()

      component.onUnitChange(group, 0, '__add_unit__')
      tick()
      expect(open).toHaveBeenCalledWith(
        jasmine.objectContaining({ forProduct: { name: 'חמוצים', baseUnit: 'kg' }, existingUnitSymbols: ['box'] })
      )

      registry.productUnitAdded$.next({ key: 'jar', amount: 350, basis: 'gram' })
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
      const save = spyOn(TestBed.inject(KitchenStateService), 'saveProduct').and.returnValue(of(product))
      spyOn(component, 'getItemMetadata').and.returnValue(product)
      spyOn(component, 'updateLineCalculations')

      component.onUnitChange(lineGroup(), 0, '__add_unit__')
      tick()
      registry.productUnitAdded$.next({ key: 'jar', amount: 350, basis: 'gram' })
      expect((save.calls.mostRecent().args[0] as Product).purchaseOptions.at(-1)?.conversionRate).toBe(350)
      expect(getConversion).not.toHaveBeenCalled()
    }))
  })
})
