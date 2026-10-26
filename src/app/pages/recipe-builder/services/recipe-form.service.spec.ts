import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormArray, FormBuilder } from '@angular/forms'
import { signal } from '@angular/core'
import { RecipeCostService } from '@services/recipe-cost.service'
import { StationRegistryService } from '@services/station-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { RecipeFormService } from './recipe-form.service'

describe('RecipeFormService.buildRecipeFromForm logistics', () => {
  let service: RecipeFormService
  let fb: FormBuilder

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(RecipeFormService)
    fb = TestBed.inject(FormBuilder)
  })

  const form = (baseline: { equipmentId: string; quantity: number }[]) =>
    fb.group({
      nameHebrew: ['x'],
      recipe_type: ['preparation'],
      serving_portions: [1],
      yield_conversions: fb.array([fb.group({ amount: [1], unit: ['gram'] })]),
      ingredients: fb.array([]),
      workflow_items: fb.array([]),
      total_weight_g: [0],
      total_cost: [0],
      labels: [[] as string[]],
      course: [''],
      logistics: fb.group({
        baseline: fb.array(baseline.map((b) => service.createBaselineRow({ ...b, phase: 'both', isCritical: true })))
      })
    })

  // The server merges a PUT over the stored doc: leaving `logistics` out keeps a legacy
  // `null` (schema 400) or the tools the user just removed.
  it('sends an empty baseline when no tools are left', () => {
    const recipe = service.buildRecipeFromForm(form([]), 'r1', false)
    expect(recipe.logistics).toEqual({ baseline: [] })
  })

  it('sends the chosen tools', () => {
    const recipe = service.buildRecipeFromForm(form([{ equipmentId: 'e1', quantity: 2 }]), 'r1', false)
    expect(recipe.logistics?.baseline.map((b) => b.equipmentId)).toEqual(['e1'])
  })
})

// Plan 377 — opening a recipe shows today's cost, not the cost saved with the recipe.
describe('RecipeFormService.patchFormFromRecipe ingredient cost', () => {
  let service: RecipeFormService
  let fb: FormBuilder
  let costSpy: jasmine.SpyObj<RecipeCostService>

  beforeEach(() => {
    costSpy = jasmine.createSpyObj<RecipeCostService>('RecipeCostService', ['getCostForIngredient'])
    costSpy.getCostForIngredient.and.returnValue(42)
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RecipeCostService, useValue: costSpy },
        {
          provide: KitchenStateService,
          useValue: {
            products_: signal([{ _id: 'p1', nameHebrew: 'בצל', baseUnit: 'kg' } as Product]),
            recipes_: signal<Recipe[]>([])
          }
        }
      ]
    })
    service = TestBed.inject(RecipeFormService)
    fb = TestBed.inject(FormBuilder)
  })

  const form = () =>
    fb.group({
      nameHebrew: [''],
      recipe_type: ['preparation'],
      serving_portions: [1],
      yield_conversions: fb.array([]),
      ingredients: fb.array([]),
      workflow_items: fb.array([]),
      total_weight_g: [0],
      total_cost: [0],
      labels: [[] as string[]],
      course: ['']
    })
  const recipe = (referenceId: string): Recipe =>
    ({
      _id: 'r1',
      nameHebrew: 'מתכון',
      ingredients: [{ referenceId, type: 'product', amount: 1, unit: 'jar', calculatedCost: 5, nameSnapshot: 'x' }],
      steps: [],
      yieldAmount: 1,
      yieldUnit: 'gram',
      defaultStation: '',
      isApproved: false
    }) as unknown as Recipe

  it('uses the live cost when the product is known', () => {
    const f = form()
    service.patchFormFromRecipe(f, recipe('p1'))
    expect((f.get('ingredients') as FormArray).at(0).get('total_cost')?.value).toBe(42)
  })

  it('falls back to the saved cost when the product is gone', () => {
    const f = form()
    service.patchFormFromRecipe(f, recipe('missing'))
    expect((f.get('ingredients') as FormArray).at(0).get('total_cost')?.value).toBe(5)
  })
})

// Plan 436 — the station chosen in the recipe header is saved and restored.
describe('RecipeFormService default station', () => {
  let service: RecipeFormService
  let fb: FormBuilder

  beforeEach(() => {
    const stations = jasmine.createSpyObj<StationRegistryService>('StationRegistryService', ['hasStation'])
    stations.hasStation.and.callFake((k: string) => ['חם', 'קר'].includes(k))
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StationRegistryService, useValue: stations }
      ]
    })
    service = TestBed.inject(RecipeFormService)
    fb = TestBed.inject(FormBuilder)
  })

  const form = (station: string) =>
    fb.group({
      nameHebrew: ['x'],
      recipe_type: ['preparation'],
      serving_portions: [1],
      yield_conversions: fb.array([fb.group({ amount: [1], unit: ['gram'] })]),
      ingredients: fb.array([]),
      workflow_items: fb.array([]),
      total_weight_g: [0],
      total_cost: [0],
      labels: [[] as string[]],
      course: [''],
      default_station: [station],
      logistics: fb.group({ baseline: fb.array([]) })
    })

  it('saves a known station key', () => {
    expect(service.buildRecipeFromForm(form('קר'), 'r1', false).defaultStation).toBe('קר')
  })

  it('saves an empty station for an unknown key', () => {
    expect(service.buildRecipeFromForm(form('לא קיימת'), 'r1', false).defaultStation).toBe('')
  })

  it('saves an empty station when none is chosen', () => {
    expect(service.buildRecipeFromForm(form(''), 'r1', false).defaultStation).toBe('')
  })

  it('fills default_station from the recipe when the form is patched', () => {
    const f = form('')
    service.patchFormFromRecipe(f, {
      _id: 'r1',
      nameHebrew: 'מתכון',
      ingredients: [],
      steps: [],
      yieldAmount: 1,
      yieldUnit: 'gram',
      defaultStation: 'קר',
      isApproved: false
    } as unknown as Recipe)
    expect(f.get('default_station')?.value).toBe('קר')
  })
})

// Plan 439 — a recipe with "not ready" rows (a name, no product) still saves, and keeps their text.
describe('RecipeFormService unready ingredient rows', () => {
  let service: RecipeFormService
  let fb: FormBuilder

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(RecipeFormService)
    fb = TestBed.inject(FormBuilder)
  })

  it('accepts an unlinked row with a name and no amount', () => {
    const row = service.createIngredientGroup()
    row.patchValue({ nameHebrew: 'קצת פטרוזיליה', amount_net: null })
    expect(row.valid).toBeTrue()
    row.patchValue({ amount_net: 0 })
    expect(row.valid).toBeTrue()
  })

  it('still rejects a linked row without an amount', () => {
    const row = service.createIngredientGroup()
    row.patchValue({ referenceId: 'p1', item_type: 'product', nameHebrew: 'בצל', amount_net: null })
    expect(row.valid).toBeFalse()
  })

  it('keeps the unlinked row in the save payload with amount 0 and its text', () => {
    const unready = service.createIngredientGroup()
    unready.patchValue({ nameHebrew: 'קצת פטרוזיליה', amount_net: null, unit: 'unit' })
    const linked = service.createIngredientGroup()
    linked.patchValue({ referenceId: 'p1', item_type: 'product', nameHebrew: 'בצל', amount_net: 2, unit: 'kg' })
    const f = fb.group({
      nameHebrew: ['x'],
      recipe_type: ['preparation'],
      serving_portions: [1],
      yield_conversions: fb.array([fb.group({ amount: [1], unit: ['gram'] })]),
      ingredients: fb.array([linked, unready, service.createIngredientGroup()]),
      workflow_items: fb.array([]),
      total_weight_g: [0],
      total_cost: [0],
      labels: [[] as string[]],
      course: ['']
    })
    const recipe = service.buildRecipeFromForm(f, 'r1', false)
    expect(recipe.ingredients.length).toBe(2)
    const kept = recipe.ingredients[1]
    expect(kept.amount).toBe(0)
    expect(kept.nameSnapshot).toBe('קצת פטרוזיליה')
    expect(kept.referenceId).toBeUndefined()
  })
})
