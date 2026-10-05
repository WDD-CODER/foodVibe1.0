import { signal } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { RecipeYieldManager } from './recipe-yield-manager.util'

describe('RecipeYieldManager.toggleType', () => {
  const fb = new FormBuilder()
  const totalWeightG = signal(600)
  let resetTrigger: ReturnType<typeof signal<number>>
  let form: FormGroup
  let yieldManager: RecipeYieldManager

  function build(type: 'dish' | 'preparation', portions: number, conversion: { amount: number; unit: string }): void {
    form = fb.group({
      recipe_type: [type],
      serving_portions: [portions],
      yield_conversions: fb.array([fb.group(conversion)])
    })
    resetTrigger = signal(0)
    yieldManager = new RecipeYieldManager(signal(form), signal(['gram', 'kg', 'dish']), resetTrigger, fb, {
      totalWeightG,
      totalVolumeMl: signal(0),
      getConversion: (unit) => ({ gram: 1, kg: 1000 })[unit] ?? 0
    })
  }

  const firstConversion = (): { amount: number; unit: string } => form.get('yield_conversions')!.value[0]

  beforeEach(() => totalWeightG.set(600))

  it('dish → preparation uses the ingredient weight, not the portion count as grams', () => {
    build('dish', 4, { amount: 4, unit: 'dish' })
    const followWeight = yieldManager.toggleType()
    expect(form.get('recipe_type')!.value).toBe('preparation')
    expect(firstConversion()).toEqual({ amount: 600, unit: 'gram' })
    expect(followWeight).toBeTrue()
  })

  it('dish(4) → preparation → dish returns exactly 4 portions', () => {
    build('dish', 4, { amount: 4, unit: 'dish' })
    yieldManager.toggleType()
    const followWeight = yieldManager.toggleType()
    expect(form.get('recipe_type')!.value).toBe('dish')
    expect(form.get('serving_portions')!.value).toBe(4)
    expect(firstConversion()).toEqual({ amount: 4, unit: 'dish' })
    expect(followWeight).toBeFalse()
  })

  it('a new preparation → dish gives 1 portion, not the gram amount', () => {
    build('preparation', 1, { amount: 500, unit: 'gram' })
    yieldManager.toggleType()
    expect(form.get('serving_portions')!.value).toBe(1)
    expect(firstConversion()).toEqual({ amount: 1, unit: 'dish' })
  })

  it('preparation → dish → preparation restores the previous yield and its manual flag', () => {
    build('preparation', 1, { amount: 2, unit: 'kg' })
    yieldManager.isManualOverride_.set(true)
    yieldManager.toggleType()
    const followWeight = yieldManager.toggleType()
    expect(firstConversion()).toEqual({ amount: 2, unit: 'kg' })
    expect(yieldManager.isManualOverride_()).toBeTrue()
    expect(followWeight).toBeFalse()
  })

  it('a reset (another recipe loaded) drops the cache', () => {
    build('dish', 4, { amount: 4, unit: 'dish' })
    yieldManager.toggleType()
    resetTrigger.set(1)
    yieldManager.toggleType()
    expect(form.get('serving_portions')!.value).toBe(1)
  })
})
