import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormArray, FormBuilder, FormGroup } from '@angular/forms'
import { signal } from '@angular/core'
import { KitchenStateService } from '@services/kitchen-state.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { AiRecipeDraftService } from '@services/ai-recipe-draft.service'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { RecipeAiFlowService } from './recipe-ai-flow.service'
import { RecipeFormService } from './recipe-form.service'

describe('RecipeAiFlowService.applyPendingDraft', () => {
  let service: RecipeAiFlowService
  let draftService: AiRecipeDraftService
  let recipeForm: FormGroup

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RecipeAiFlowService,
        {
          provide: KitchenStateService,
          useValue: {
            products_: signal([{ _id: 'p1', nameHebrew: 'עגבניות', baseUnit: 'kg' } as Product]),
            recipes_: signal<Recipe[]>([])
          }
        },
        { provide: UnitRegistryService, useValue: { allUnitKeys_: signal(['kg', 'gram', 'unit']) } }
      ]
    })
    service = TestBed.inject(RecipeAiFlowService)
    draftService = TestBed.inject(AiRecipeDraftService)
    const fb = TestBed.inject(FormBuilder)
    recipeForm = fb.group({
      nameHebrew: [''],
      recipe_type: ['preparation'],
      serving_portions: [1],
      yield_conversions: fb.array([]),
      ingredients: fb.array([]),
      workflow_items: fb.array([]),
      logistics: fb.group({ baseline: fb.array([]) })
    })
    service.init({
      recipeForm,
      ingredientsFormVersion_: signal(0),
      netoConfirmed_: signal(false),
      addNewIngredientRow: () => undefined
    })
    void TestBed.inject(RecipeFormService)
  })

  const rows = () => (recipeForm.get('ingredients') as FormArray).controls

  it('links a draft ingredient with a known unit to the product of that name', () => {
    draftService.set({
      nameHebrew: 'רוטב',
      recipe_type: 'preparation',
      yield_amount: 1,
      yield_unit: 'kg',
      ingredients: [{ name: 'עגבניות', amount: 2, unit: 'kg' }],
      steps: []
    })
    expect(service.applyPendingDraft()).toBeTrue()
    expect(rows()[0].get('referenceId')?.value).toBe('p1')
    expect(rows()[0].get('unit')?.value).toBe('kg')
  })

  it('keeps a draft ingredient with an unknown unit unlinked and puts the unit text in its name', () => {
    draftService.set({
      nameHebrew: 'רוטב',
      recipe_type: 'preparation',
      yield_amount: 1,
      yield_unit: 'kg',
      ingredients: [{ name: 'עגבניות', amount: 2, unit: 'קופסה' }],
      steps: []
    })
    service.applyPendingDraft()
    expect(rows()[0].get('referenceId')?.value).toBeNull()
    expect(rows()[0].get('nameHebrew')?.value).toBe('עגבניות (קופסה)')
    expect(rows()[0].get('unit')?.value).toBe('unit')
  })
})
