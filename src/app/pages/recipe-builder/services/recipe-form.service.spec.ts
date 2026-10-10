import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormBuilder } from '@angular/forms'
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
