import { signal, computed, type Signal } from '@angular/core'
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { quantityIncrement, quantityDecrement } from './quantity-step.util'
import { MASS_UNITS, VOLUME_UNITS } from './recipe-cost.constants'

export interface YieldAutoSyncConfig {
  totalWeightG: Signal<number>;
  totalVolumeMl: Signal<number>;
  getConversion: (unitKey: string) => number;
}

export class RecipeYieldManager {
  private readonly manualTrigger_ = signal(0)
  readonly isManualOverride_ = signal(false)

  constructor(
    private readonly form: Signal<FormGroup>,
    private readonly allUnitKeys: Signal<string[]>,
    private readonly resetTrigger: Signal<number>,
    private readonly fb: FormBuilder,
    private readonly autoSyncConfig?: YieldAutoSyncConfig
  ) {}

  // --- Computeds ---

  readonly usedUnits_ = computed(() => {
    this.manualTrigger_()
    this.resetTrigger()
    const conversions = this.form().get('yield_conversions') as FormArray
    if (!conversions?.length) return new Set<string>()
    return new Set(conversions.value.map((c: { unit?: string }) => c.unit).filter(Boolean))
  })

  readonly availablePrimaryUnits_ = computed(() => {
    this.manualTrigger_()
    this.resetTrigger()
    const all = this.allUnitKeys()
    const conversions = this.form().get('yield_conversions') as FormArray
    const usedSecondary = conversions?.length > 1
      ? new Set(conversions.controls.slice(1).map(c => c.get('unit')?.value).filter(Boolean))
      : new Set<string>()
    return all.filter(u => !usedSecondary.has(u))
  })

  readonly primaryUnitOptions_ = computed(() => {
    const units = this.availablePrimaryUnits_().map(u => ({ value: u, label: u }))
    return [...units, { value: '__add_unit__', label: 'create_new_unit' }]
  })

  readonly availableSecondaryUnits_ = computed(() => {
    this.manualTrigger_()
    this.resetTrigger()
    const all = this.allUnitKeys()
    const used = this.usedUnits_()
    return all.filter(u => !used.has(u))
  })

  readonly currentRecipeTypeDisplay_ = computed(() => {
    this.manualTrigger_()
    const fromForm = this.form().get('recipe_type')?.value
    return fromForm === 'dish' ? 'dish' : 'prep'
  })

  readonly primaryUnitLabel_ = computed(() => {
    this.manualTrigger_()
    this.resetTrigger()
    const f = this.form()
    const type = f.get('recipe_type')?.value

    if (type === 'dish') return 'dish'

    const conversions = f.get('yield_conversions') as FormArray
    return conversions?.at(0)?.get('unit')?.value ?? 'gram'
  })

  readonly primaryAmount_ = computed(() => {
    this.manualTrigger_()
    this.resetTrigger()
    const f = this.form()
    const type = f.get('recipe_type')?.value

    if (type === 'dish') {
      return f.get('serving_portions')?.value ?? 1
    }

    const conversions = f.get('yield_conversions') as FormArray
    return conversions?.at(0)?.get('amount')?.value ?? 0
  })

  // --- Auto-sync computeds ---

  readonly computedYieldAmount_ = computed<number | null>(() => {
    if (!this.autoSyncConfig) return null
    this.manualTrigger_()
    this.resetTrigger()

    const type = this.form().get('recipe_type')?.value
    if (type === 'dish') return null

    const unit = this.primaryUnitLabel_()
    const factor = this.autoSyncConfig.getConversion(unit)
    if (!factor || factor <= 0) return null

    if (MASS_UNITS.has(unit)) {
      const totalG = this.autoSyncConfig.totalWeightG()
      if (totalG <= 0) return null
      return Math.round((totalG / factor) * 100) / 100
    }

    if (VOLUME_UNITS.has(unit)) {
      const totalMl = this.autoSyncConfig.totalVolumeMl()
      if (totalMl <= 0) return null
      return Math.round((totalMl / factor) * 100) / 100
    }

    return null
  })

  readonly yieldDiffersFromComputed_ = computed(() => {
    const computed = this.computedYieldAmount_()
    if (computed === null) return false
    const current = this.primaryAmount_()
    return Math.abs(current - computed) > 0.01
  })

  // --- Auto-sync methods ---

  syncYieldFromMetrics(): void {
    const computed = this.computedYieldAmount_()
    if (computed === null) return
    this.isManualOverride_.set(false)
    this.applyPrimaryUpdate(computed)
  }

  resetManualOverride(): void {
    this.isManualOverride_.set(false)
    this.syncYieldFromMetrics()
  }

  // --- Getters ---

  get secondaryConversions(): FormGroup[] {
    const conversions = this.form().get('yield_conversions') as FormArray
    if (!conversions?.length) return []
    return conversions.controls.slice(1) as FormGroup[]
  }

  // --- Primary methods ---

  setPrimaryUnit(newUnit: string): void {
    const type = this.form().get('recipe_type')?.value

    if (type === 'dish') {
      if (newUnit !== 'dish') {
        this.form().get('recipe_type')?.setValue('preparation')
        const conversions = this.form().get('yield_conversions') as FormArray
        const portions = this.form().get('serving_portions')?.value ?? 1
        if (conversions?.length > 0) {
          conversions.at(0).patchValue({ unit: newUnit, amount: portions })
        }
      }
    } else {
      const conversions = this.form().get('yield_conversions') as FormArray
      if (conversions?.length > 0) {
        conversions.at(0).get('unit')?.setValue(newUnit)
      }
    }
    this.isManualOverride_.set(false)
    this.manualTrigger_.update(v => v + 1)
  }

  onPrimaryUnitChange(value: string): 'create_unit' | null {
    if (value === 'NEW_UNIT') return 'create_unit'
    this.setPrimaryUnit(value)
    return null
  }

  updatePrimaryAmount(delta: number): void {
    const current = this.primaryAmount_()
    const type = this.form().get('recipe_type')?.value
    const min = type === 'dish' ? 1 : 0
    const next = delta > 0
      ? quantityIncrement(current, min, undefined)
      : quantityDecrement(current, min, undefined)
    this.applyPrimaryUpdate(next)
    this.isManualOverride_.set(true)
  }

  onAmountManualChange(rawValue: string): void {
    const parsedValue = parseFloat(rawValue)
    if (!isNaN(parsedValue)) {
      this.applyPrimaryUpdate(parsedValue)
      this.isManualOverride_.set(true)
    }
  }

  onScalingChipAmountChange(value: number): void {
    this.applyPrimaryUpdate(value)
    this.isManualOverride_.set(true)
  }

  private applyPrimaryUpdate(newValue: number): void {
    const type = this.form().get('recipe_type')?.value
    const sanitizedValue = Math.max(type === 'dish' ? 1 : 0, newValue)

    if (type === 'dish') {
      this.form().get('serving_portions')?.setValue(sanitizedValue, { emitEvent: true })
    } else {
      const conversions = this.form().get('yield_conversions') as FormArray
      conversions.at(0).get('amount')?.setValue(sanitizedValue, { emitEvent: true })
    }

    this.manualTrigger_.update(v => v + 1)
    this.form().updateValueAndValidity({ emitEvent: true })
  }

  onPrimaryAmountKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const current = this.primaryAmount_()
    const type = this.form().get('recipe_type')?.value
    const min = type === 'dish' ? 1 : 0
    const next = e.key === 'ArrowUp'
      ? quantityIncrement(current, min, undefined)
      : quantityDecrement(current, min, undefined)
    this.applyPrimaryUpdate(next)
    this.isManualOverride_.set(true)
  }

  // --- Secondary methods ---

  addSecondaryUnit(unitSymbol: string): void {
    const conversions = this.form().get('yield_conversions') as FormArray
    const exists = conversions.value.some((c: { amount: number; unit: string }) => c.unit === unitSymbol)
    if (exists) {
      return
    }

    const newUnitGroup = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: [unitSymbol]
    })

    conversions.push(newUnitGroup)
    this.manualTrigger_.update(v => v + 1)
  }

  addSecondaryChipWithDefault(): void {
    const available = this.availableSecondaryUnits_()
    if (available.length === 0) return
    const defaultUnit = available[0]
    this.addSecondaryUnit(defaultUnit)
    const conversions = this.form().get('yield_conversions') as FormArray
    const last = conversions.at(conversions.length - 1) as FormGroup
    last.get('amount')?.setValue(1, { emitEvent: true })
    this.manualTrigger_.update(v => v + 1)
  }

  onSecondaryAmountInput(group: FormGroup, rawValue: string): void {
    const parsed = parseFloat(rawValue)
    const amountControl = group.get('amount')
    if (amountControl) {
      amountControl.patchValue(isNaN(parsed) ? 0 : Math.max(0, parsed), { emitEvent: true })
    }
    this.manualTrigger_.update(v => v + 1)
  }

  updateSecondaryAmount(index: number, delta: number): void {
    const conversions = this.form().get('yield_conversions') as FormArray
    const groupIndex = index + 1
    if (groupIndex >= conversions.length) return
    const group = conversions.at(groupIndex) as FormGroup
    const amountControl = group.get('amount')
    if (!amountControl) return
    const current = amountControl.value ?? 0
    const next = delta > 0
      ? quantityIncrement(current, 0, undefined)
      : quantityDecrement(current, 0, undefined)
    amountControl.setValue(Math.max(0, next), { emitEvent: true })
    this.manualTrigger_.update(v => v + 1)
  }

  onSecondaryScalingChipAmountChange(chipIdx: number, value: number): void {
    const conversions = this.form().get('yield_conversions') as FormArray
    const groupIndex = chipIdx + 1
    if (groupIndex >= conversions.length) return
    const group = conversions.at(groupIndex) as FormGroup
    const amountControl = group.get('amount')
    if (amountControl) {
      amountControl.setValue(Math.max(0, value), { emitEvent: true })
    }
    this.manualTrigger_.update(v => v + 1)
  }

  changeSecondaryUnit(chipIndex: number, newUnit: string): void {
    const conversions = this.form().get('yield_conversions') as FormArray
    const groupIndex = chipIndex + 1
    if (groupIndex >= conversions.length) return
    const group = conversions.at(groupIndex) as FormGroup
    const currentUnit = group.get('unit')?.value
    if (currentUnit === newUnit) return
    const exists = conversions.controls.some((c, i) => i !== groupIndex && c.get('unit')?.value === newUnit)
    if (exists) return
    group.get('unit')?.setValue(newUnit, { emitEvent: true })
    this.manualTrigger_.update(v => v + 1)
  }

  onSecondaryAmountKeydown(e: KeyboardEvent, index: number): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    this.updateSecondaryAmount(index, e.key === 'ArrowUp' ? 1 : -1)
  }

  removeSecondaryUnit(index: number): void {
    const conversions = this.form().get('yield_conversions') as FormArray
    conversions.removeAt(index + 1)
    this.manualTrigger_.update(v => v + 1)
  }

  availableUnitsForSecondaryChip_(chipIdx: number): string[] {
    const conversions = this.form().get('yield_conversions') as FormArray
    const used = new Set<string>()
    conversions.controls.forEach((c) => {
      const u = c.get('unit')?.value
      if (u) used.add(u)
    })
    return this.allUnitKeys().filter(u => !used.has(u))
  }

  getSecondaryUnitOptions(chipIdx: number): { value: string; label: string }[] {
    const available = this.availableUnitsForSecondaryChip_(chipIdx)
    const group = this.secondaryConversions[chipIdx]
    const currentUnit = group?.get('unit')?.value
    let units = available
    if (currentUnit && !available.includes(currentUnit)) {
      units = [currentUnit, ...available]
    }
    const options = units.map(u => ({ value: u, label: u }))
    return [...options, { value: '__add_unit__', label: 'create_new_unit' }]
  }

  // --- Type toggle ---

  toggleType(): void {
    const current = this.form().get('recipe_type')?.value
    const conversions = this.form().get('yield_conversions') as FormArray
    if (current === 'dish') {
      this.form().get('recipe_type')?.setValue('preparation')
      if (conversions?.length > 0) {
        const portions = this.form().get('serving_portions')?.value ?? 1
        conversions.at(0).patchValue({ amount: portions, unit: 'gram' })
      }
      this.isManualOverride_.set(false)
    } else {
      this.form().get('recipe_type')?.setValue('dish')
      if (conversions?.length > 0) {
        const amount = conversions.at(0).get('amount')?.value ?? 1
        this.form().get('serving_portions')?.setValue(Math.max(1, amount), { emitEvent: true })
        conversions.at(0).patchValue({ unit: 'dish' })
      }
    }
    this.manualTrigger_.update(v => v + 1)
    this.form().updateValueAndValidity({ emitEvent: true })
  }

  // --- Misc ---

  bump(): void {
    this.manualTrigger_.update(v => v + 1)
  }
}
