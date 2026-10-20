import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormArray, FormBuilder } from '@angular/forms'
import { signal } from '@angular/core'
import { RecipeCostService } from '@services/recipe-cost.service'
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
