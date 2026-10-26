import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { RecipeHeaderComponent } from './recipe-header.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { StationRegistryService } from '@services/station-registry.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service'
import { computed, signal, WritableSignal } from '@angular/core'

describe('RecipeHeaderComponent', () => {
  let component: RecipeHeaderComponent
  let fixture: ComponentFixture<RecipeHeaderComponent>
  let fb: FormBuilder
  let stations_: WritableSignal<string[]>
  let stationRegistrySpy: jasmine.SpyObj<StationRegistryService>
  let addItemModalSpy: jasmine.SpyObj<AddItemModalService>

  function createRecipeForm(
    overrides: { recipe_type?: 'dish' | 'preparation'; serving_portions?: number; yield_conversions?: FormArray } = {}
  ) {
    const type = overrides.recipe_type ?? 'preparation'
    const conversions = overrides.yield_conversions ?? fb.array([fb.group({ unit: ['gram'], amount: [1] })])
    return fb.group({
      recipe_type: [type],
      serving_portions: [overrides.serving_portions ?? 1],
      yield_conversions: conversions,
      nameHebrew: [''],
      total_weight_g: [0],
      labels: [[] as string[]],
      course: [''],
      default_station: ['']
    })
  }

  beforeEach(async () => {
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion', 'openUnitCreator'], {
      allUnitKeys_: signal(['gram', 'kg', 'dish', 'liter']),
      isCreatorOpen_: signal(false)
    })
    unitRegistrySpy.getConversion.and.returnValue(1)

    const metadataRegistrySpy = jasmine.createSpyObj('MetadataRegistryService', [], {
      allLabels_: signal([
        { key: 'vegan', color: '#10B981' },
        { key: 'gluten-free', color: '#F59E0B' }
      ]),
      courses_: signal<{ key: string; color: string }[]>([])
    })
    const labelCreationModalSpy = jasmine.createSpyObj('LabelCreationModalService', ['open'])
    labelCreationModalSpy.open.and.returnValue(Promise.resolve(null))

    stations_ = signal(['חם', 'קר'])
    stationRegistrySpy = jasmine.createSpyObj<StationRegistryService>(
      'StationRegistryService',
      ['addStation', 'hasStation'],
      { stations_: stations_ as never }
    )
    stationRegistrySpy.hasStation.and.callFake((k: string) => stations_().includes(k))
    stationRegistrySpy.addStation.and.callFake((n: string) => {
      stations_.update((l) => [...l, n.trim()])
      return Promise.resolve(n.trim())
    })
    addItemModalSpy = jasmine.createSpyObj<AddItemModalService>('AddItemModalService', ['open'])
    addItemModalSpy.open.and.returnValue(Promise.resolve(null))

    await TestBed.configureTestingModule({
      imports: [RecipeHeaderComponent, ReactiveFormsModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        FormBuilder,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: KitchenStateService, useValue: {} },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
        { provide: MetadataRegistryService, useValue: metadataRegistrySpy },
        { provide: LabelCreationModalService, useValue: labelCreationModalSpy },
        { provide: StationRegistryService, useValue: stationRegistrySpy },
        { provide: AddItemModalService, useValue: addItemModalSpy }
      ]
    }).compileComponents()

    fb = TestBed.inject(FormBuilder)

    fixture = TestBed.createComponent(RecipeHeaderComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('form', createRecipeForm())
    fixture.componentRef.setInput('currentCost', 0)
    fixture.componentRef.setInput('totalWeightG', 0)
    fixture.detectChanges()
  })

  it('patches only the unlinked ingredient rows with the linked name when the badge emits linked (plan 466)', () => {
    const row = (nameHebrew: string, referenceId = '') =>
      fb.group({ nameHebrew: [nameHebrew], referenceId: [referenceId], item_type: [''], nameSnapshot: [''] })
    const ingredients = fb.array([row('פטרוזיליה'), row('פטרוזיליה', 'p9'), row('מלח')])
    const form = fb.group({ ...createRecipeForm().controls, ingredients })
    fixture.componentRef.setInput('form', form)
    spyOn(component['recipeCost'], 'getCostForIngredient').and.returnValue(0)

    component['onLinked']({ name: 'פטרוזיליה', product: { _id: 'p1', nameHebrew: 'פטרוזיליה טרייה' } as never })

    expect(ingredients.at(0).value).toEqual(
      jasmine.objectContaining({ referenceId: 'p1', item_type: 'product', nameSnapshot: 'פטרוזיליה טרייה' })
    )
    expect(ingredients.at(1).value.referenceId).toBe('p9')
    expect(ingredients.at(2).value.referenceId).toBe('')
  })

  it('prices a linked row so the cost recomputes (plan 466)', () => {
    const row = fb.group({
      nameHebrew: ['פטרוזיליה'],
      referenceId: [''],
      item_type: [''],
      nameSnapshot: [''],
      amount_net: [200],
      unit: ['gram'],
      total_cost: [0]
    })
    const form = fb.group({ ...createRecipeForm().controls, ingredients: fb.array([row]) })
    fixture.componentRef.setInput('form', form)
    const costSpy = spyOn(component['recipeCost'], 'getCostForIngredient').and.returnValue(12.5)

    component['onLinked']({ name: 'פטרוזיליה', product: { _id: 'p1', nameHebrew: 'פטרוזיליה טרייה' } as never })

    expect(costSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ referenceId: 'p1', type: 'product', amount: 200, unit: 'gram' })
    )
    expect(row.value.total_cost).toBe(12.5)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('shows a course that is no longer a dish type as no_course, never as its raw key', () => {
    const registry = TestBed.inject(MetadataRegistryService) as unknown as {
      courses_: WritableSignal<{ key: string; color: string }[]>
    }
    registry.courses_.set([{ key: 'starter', color: '#78716C' }])
    component.form().get('course')?.setValue('trash_category')
    fixture.detectChanges()
    const options = component['courseSelectOptions_']()
    expect(options).toContain({ value: 'trash_category', label: 'no_course' })
    expect(options.some((o) => o.label === 'trash_category')).toBeFalse()

    component.form().get('course')?.setValue('starter')
    expect(component['courseSelectOptions_']().map((o) => o.value)).toEqual(['', 'starter'])
  })

  it('station options start with general_group, list the station keys, then the add option', () => {
    const options = component['stationSelectOptions_']()
    expect(options[0]).toEqual({ value: '', label: 'general_group' })
    expect(options.slice(1, 3).map((o) => o.value)).toEqual(['חם', 'קר'])
    expect(options[options.length - 1]).toEqual({ value: '__add_station__', label: 'add_new_station' })
  })

  it('a station deleted elsewhere shows as general_group, never as its raw key', () => {
    component.form().get('default_station')?.setValue('גריל')
    const options = component['stationSelectOptions_']()
    expect(options).toContain({ value: 'גריל', label: 'general_group' })
    expect(options.some((o) => o.label === 'גריל')).toBeFalse()
  })

  it('choosing the add option opens the add window prefilled and selects the stored key after save', async () => {
    addItemModalSpy.open.and.returnValue(Promise.resolve('גריל'))
    component.form().get('default_station')?.setValue('חם')
    component.form().get('default_station')?.setValue('__add_station__')
    await component['onAddStation']('גר')
    expect(addItemModalSpy.open).toHaveBeenCalledWith(
      jasmine.objectContaining({ initialValue: 'גר', title: 'add_new_station' })
    )
    expect(stationRegistrySpy.addStation).toHaveBeenCalledWith('גריל')
    expect(component.form().get('default_station')?.value).toBe('גריל')
  })

  it('cancelling the add window puts the previous station back', async () => {
    component.form().get('default_station')?.setValue('קר')
    component.form().get('default_station')?.setValue('__add_station__')
    await component['onAddStation']('')
    expect(stationRegistrySpy.addStation).not.toHaveBeenCalled()
    expect(component.form().get('default_station')?.value).toBe('קר')
  })

  it('should display currentCost from input', () => {
    fixture.componentRef.setInput('currentCost', 12.5)
    fixture.detectChanges()
    const el = fixture.nativeElement as HTMLElement
    expect(el.textContent).toContain('12.5')
  })

  it('should display totalWeightG from input', () => {
    fixture.componentRef.setInput('totalBrutoWeightG', 350)
    fixture.detectChanges()
    const el = fixture.nativeElement as HTMLElement
    expect(el.textContent).toContain('350g')
  })

  it('should toggle recipe_type between dish and preparation', () => {
    const form = createRecipeForm({ recipe_type: 'preparation' })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    expect(form.get('recipe_type')?.value).toBe('preparation')
    component['toggleTypeWrapper']()
    expect(form.get('recipe_type')?.value).toBe('dish')
    component['toggleTypeWrapper']()
    expect(form.get('recipe_type')?.value).toBe('preparation')
  })

  it('should update primary amount when updatePrimaryAmount is called (precision/magnitude step)', () => {
    const form = createRecipeForm({ recipe_type: 'preparation' })
    const conversions = form.get('yield_conversions') as FormArray
    conversions.at(0).get('amount')?.setValue(2)
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    component.yield.updatePrimaryAmount(1)
    expect(conversions.at(0).get('amount')?.value).toBe(3)
    component.yield.updatePrimaryAmount(-1)
    expect(conversions.at(0).get('amount')?.value).toBe(2)
  })

  it('should update primary amount when scaling chip emits valueChange', () => {
    const form = createRecipeForm({ recipe_type: 'preparation' })
    const conversions = form.get('yield_conversions') as FormArray
    conversions.at(0).get('amount')?.setValue(2)
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    component.yield.onScalingChipAmountChange(5)
    expect(conversions.at(0).get('amount')?.value).toBe(5)
  })

  it('should call openUnitCreator service when onPrimaryUnitChange returns create_unit', () => {
    const result = component.yield.onPrimaryUnitChange('NEW_UNIT')
    expect(result).toBe('create_unit')
  })

  it('should resolve primary unit label to dish when recipe_type is dish', () => {
    const form = createRecipeForm({ recipe_type: 'dish' })
    const conversions = form.get('yield_conversions') as FormArray
    conversions.at(0).patchValue({ unit: 'dish', amount: 4 })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    expect(component.yield.primaryUnitLabel_()).toBe('dish')
  })

  it('should disable secondary chip minus button when amount is zero', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [0] })
    ])
    const form = createRecipeForm({ yield_conversions: conversions })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    const minusBtn = fixture.nativeElement.querySelector('.scaling-chip--secondary .ctrl-btn[disabled]')
    expect(minusBtn).toBeTruthy()
  })

  it('should update secondary amount when scaling chip emits valueChange', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [2] })
    ])
    const form = createRecipeForm({ yield_conversions: conversions })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    component.yield.onSecondaryScalingChipAmountChange(0, 5)
    expect(conversions.at(1).get('amount')?.value).toBe(5)
  })

  it('should update secondary chip amount when +/- is clicked (precision/magnitude step)', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [2] })
    ])
    const form = createRecipeForm({ yield_conversions: conversions })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    component.yield.updateSecondaryAmount(0, 1)
    expect(conversions.at(1).get('amount')?.value).toBe(3)
    component.yield.updateSecondaryAmount(0, -1)
    expect(conversions.at(1).get('amount')?.value).toBe(2)
  })

  it('should exclude used units from availableSecondaryUnits_', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [1] })
    ])
    const form = createRecipeForm({ yield_conversions: conversions })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    const available = component.yield.availableSecondaryUnits_()
    expect(available).not.toContain('gram')
    expect(available).not.toContain('liter')
  })

  it('should exclude secondary units from availablePrimaryUnits_', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [1] })
    ])
    const form = createRecipeForm({ yield_conversions: conversions })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    const available = component.yield.availablePrimaryUnits_()
    expect(available).not.toContain('liter')
    expect(available).toContain('gram')
  })

  it('should remove secondary chip and make unit available again', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [1] })
    ])
    const form = createRecipeForm({ yield_conversions: conversions })
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
    expect(component.yield.availableSecondaryUnits_()).not.toContain('liter')
    component.yield.removeSecondaryUnit(0)
    fixture.detectChanges()
    expect(conversions.length).toBe(1)
    expect(component.yield.availableSecondaryUnits_()).toContain('liter')
  })
  describe('partial cost badge (plan 444)', () => {
    it('shows the badge for an unpriced ingredient and hides it when every row is priced', () => {
      const kitchen = TestBed.inject(KitchenStateService) as unknown as Record<string, unknown>
      const products = signal<unknown[]>([
        { _id: 'oil', nameHebrew: 'שמן בדיקה', baseUnit: 'kg', sources: [], purchaseOptions: [] }
      ])
      kitchen['productsById_'] = computed(() => new Map(products().map((p) => [(p as { _id: string })._id, p])))
      kitchen['recipesById_'] = computed(() => new Map())
      const form = fb.group({
        recipe_type: ['preparation'],
        serving_portions: [1],
        yield_conversions: fb.array([fb.group({ unit: ['gram'], amount: [1] })]),
        nameHebrew: ['סלט'],
        total_weight_g: [0],
        labels: [[] as string[]],
        course: [''],
        default_station: [''],
        ingredients: fb.array([fb.group({ referenceId: ['oil'], item_type: ['product'], nameHebrew: ['שמן בדיקה'] })])
      })
      fixture.componentRef.setInput('form', form)
      fixture.detectChanges()
      const el = fixture.nativeElement as HTMLElement
      expect(el.querySelector('.partial-chip')).not.toBeNull()

      products.set([
        {
          _id: 'oil',
          nameHebrew: 'שמן בדיקה',
          baseUnit: 'kg',
          sources: [{ supplierId: '', price: 20 }],
          purchaseOptions: []
        }
      ])
      fixture.detectChanges()
      expect(el.querySelector('.partial-chip')).toBeNull()
    })
  })
})
