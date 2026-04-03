import { Injectable, inject } from '@angular/core'
import { FormBuilder, FormArray, FormGroup, AbstractControl, ValidationErrors, Validators } from '@angular/forms'
import { UnitRegistryService } from '@services/unit-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { TranslationService } from '@services/translation.service'
import { Recipe, RecipeStep, FlatPrepItem, PrepCategory } from '@models/recipe.model'
import { Ingredient } from '@models/ingredient.model'
import type { BaselineEntry, EquipmentPhase } from '@models/logistics.model'

/** Item shape used when creating an ingredient row (product/recipe with optional fields). */
export interface IngredientRowItem {
  _id?: string
  name_hebrew?: string
  item_type_?: string
  base_unit_?: string
  yield_percentage?: number
}

@Injectable({ providedIn: 'root' })
export class RecipeFormService {
  private readonly fb = inject(FormBuilder)
  private readonly unitRegistry = inject(UnitRegistryService)
  private readonly state = inject(KitchenStateService)
  private readonly recipeCost = inject(RecipeCostService)
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly translation = inject(TranslationService)

  // ─── Validators ───────────────────────────────────────────────────

  /** Require amount > 0 when referenceId is set; empty rows are valid. */
  ingredientRowValidator(control: AbstractControl): ValidationErrors | null {
    const refId = control.get('referenceId')?.value
    const amount = control.get('amount_net')?.value
    if (!refId) return null
    if (amount == null || amount === '') return { required: true }
    const numAmt = typeof amount === 'number' ? amount : Number(amount)
    if (isNaN(numAmt) || numAmt <= 0) return { min: true }
    return null
  }

  /** Requires at least one ingredient with product/recipe selected and quantity > 0. */
  recipeFormValidator(control: AbstractControl): ValidationErrors | null {
    const ingredients = (control.get('ingredients')?.value || []) as { referenceId?: string; amount_net?: number | string }[]
    const hasValid = ingredients.some(ing => {
      if (!ing?.referenceId) return false
      const amt = ing.amount_net
      const num = typeof amt === 'number' ? amt : Number(amt)
      return amt != null && amt !== '' && !isNaN(num) && num > 0
    })
    return hasValid ? null : { atLeastOneIngredient: true }
  }

  // ─── Form Group Factories ─────────────────────────────────────────

  createIngredientGroup(item: IngredientRowItem | null = null): FormGroup {
    return this.fb.group(
      {
        referenceId: [item?._id ?? null],
        item_type: [item?.item_type_ ?? null],
        name_hebrew: [item?.name_hebrew ?? ''],
        amount_net: [item ? 1 : null, [Validators.min(0)]],
        yield_percentage: [item?.yield_percentage ?? 1],
        unit: [item?.base_unit_ ?? 'gram'],
        total_cost: [0]
      },
      { validators: (c) => this.ingredientRowValidator(c) }
    )
  }

  createStepGroup(order: number): FormGroup {
    return this.fb.group({
      order: [order],
      instruction: [''],
      labor_time: [0]
    })
  }

  createPrepItemRow(row?: {
    preparation_name?: string
    category_name?: string
    main_category_name?: string
    quantity?: number
    unit?: string
  }): FormGroup {
    const units = this.unitRegistry.allUnitKeys_()
    const defaultUnit = units[0] ?? 'unit'
    return this.fb.group({
      preparation_name: [row?.preparation_name ?? ''],
      category_name: [row?.category_name ?? ''],
      main_category_name: [row?.main_category_name ?? ''],
      quantity: [row?.quantity ?? 1, [Validators.min(0)]],
      unit: [row?.unit ?? defaultUnit, Validators.required]
    })
  }

  createBaselineRow(entry?: BaselineEntry & { name_hebrew_?: string }): FormGroup {
    return this.fb.group({
      equipment_id_: [entry?.equipment_id_ ?? '', Validators.required],
      quantity_: [entry?.quantity_ ?? 1, [Validators.required, Validators.min(0)]],
      phase_: [entry?.phase_ ?? 'both'],
      is_critical_: [entry?.is_critical_ ?? true],
      notes_: [entry?.notes_ ?? ''],
      name_hebrew_: [entry?.name_hebrew_ ?? ''],
    })
  }

  // ─── Pure Helpers ─────────────────────────────────────────────────

  getPrepRowsFromRecipe(recipe: Recipe): { preparation_name: string; category_name: string; main_category_name: string; quantity: number; unit: string }[] {
    if (recipe.prep_items_?.length) {
      return recipe.prep_items_.map(p => ({
        preparation_name: p.preparation_name,
        category_name: p.category_name,
        main_category_name: p.main_category_name ?? p.category_name,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? 'unit'
      }))
    }
    if (recipe.prep_categories_?.length) {
      const rows: { preparation_name: string; category_name: string; main_category_name: string; quantity: number; unit: string }[] = []
      recipe.prep_categories_.forEach(cat => {
        ;(cat.items ?? []).forEach(it => {
          rows.push({
            preparation_name: it.item_name,
            category_name: cat.category_name,
            main_category_name: cat.category_name,
            quantity: it.quantity ?? 1,
            unit: it.unit ?? 'unit'
          })
        })
      })
      return rows
    }
    return []
  }

  /** Normalize label keys: map Hebrew or orphan keys to current registry keys so dropdown filter works. */
  normalizeLabelKeys(rawLabels: string[]): string[] {
    if (!rawLabels?.length) return []
    const registryKeys = new Set(this.metadataRegistry.allLabels_().map(def => def.key))
    return rawLabels
      .map(label => {
        const trimmed = (label ?? '').trim()
        if (!trimmed) return null
        if (registryKeys.has(trimmed)) return trimmed
        const labelDisplay = this.translation.translate(trimmed)
        const match = this.metadataRegistry.allLabels_().find(
          def => this.translation.translate(def.key) === labelDisplay
        )
        return match ? match.key : null
      })
      .filter((k): k is string => k != null)
  }

  // ─── Build / Patch ────────────────────────────────────────────────

  buildRecipeFromForm(form: FormGroup, recipeId: string | null, isApproved: boolean): Recipe {
    const raw = form.getRawValue() as Record<string, unknown>
    const isDish = raw['recipe_type'] === 'dish'

    type IngRow = { referenceId?: string; item_type?: string; amount_net?: number; unit?: string; total_cost?: number }
    const rawIngredients = (raw['ingredients'] || []) as IngRow[]
    const ingredients: Ingredient[] = rawIngredients
      .filter(ing => !!ing?.referenceId)
      .map(ing => ({
        _id: 'ing_' + Math.random().toString(36).slice(2, 9),
        referenceId: ing.referenceId!,
        type: (ing.item_type === 'recipe' ? 'recipe' : 'product') as 'product' | 'recipe',
        amount_: ing.amount_net ?? 0,
        unit_: ing.unit ?? '',
        calculatedCost_: ing.total_cost ?? 0
      }))

    const steps: RecipeStep[] = []
    let prepItems: FlatPrepItem[] | undefined
    let prepCategories: PrepCategory[] | undefined

    if (isDish) {
      type PrepRow = { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number | string; unit?: string }
      const rows = (raw['workflow_items'] || []) as PrepRow[]
      prepItems = rows
        .filter(r => !!r?.preparation_name?.trim())
        .map(r => {
          const qty = typeof r.quantity === 'number' ? r.quantity : (Number(r.quantity) || 1)
          const item: FlatPrepItem = {
            preparation_name: r.preparation_name ?? '',
            category_name: r.category_name ?? '',
            quantity: qty,
            unit: r.unit ?? 'unit'
          }
          if (r.main_category_name !== undefined && r.main_category_name !== '') {
            item.main_category_name = r.main_category_name
          }
          return item
        })

      const byCategory = new Map<string, { item_name: string; unit: string; quantity?: number }[]>()
      prepItems.forEach(p => {
        const list = byCategory.get(p.category_name) ?? []
        list.push({ item_name: p.preparation_name, unit: p.unit, quantity: p.quantity })
        byCategory.set(p.category_name, list)
      })
      prepCategories = Array.from(byCategory.entries()).map(([category_name, items]) => ({
        category_name,
        items: items.map(it => ({ item_name: it.item_name, unit: it.unit }))
      }))
    } else {
      type StepRow = { order?: number; instruction?: string; labor_time?: number }
      const stepRows = (raw['workflow_items'] || []) as StepRow[]
      stepRows
        .filter(s => !!s?.instruction?.trim())
        .forEach((step, i) => {
          steps.push({
            order_: step?.order ?? i + 1,
            instruction_: step?.instruction ?? '',
            labor_time_minutes_: step?.labor_time ?? 0
          })
        })
    }

    const yieldConvRows = (raw['yield_conversions'] as { amount?: number; unit?: string }[] | undefined) ?? []
    const yieldConv = yieldConvRows[0]
    const yieldAmount = isDish ? ((raw['serving_portions'] as number) ?? 1) : (yieldConv?.amount ?? 0)
    const yieldUnit = isDish ? 'מנה' : (yieldConv?.unit ?? 'gram')
    const yieldConversions = yieldConvRows
      .filter(r => r?.unit != null && r.unit !== '')
      .map(r => ({ amount: Number(r?.amount ?? 0), unit: String(r.unit) }))

    const rawLabels = (raw['labels'] as string[] | undefined) ?? []
    const validKeys = new Set(this.metadataRegistry.allLabels_().map(def => def.key))
    const labels = rawLabels.filter(k => validKeys.has((k ?? '').trim()))

    return {
      _id: (recipeId ?? '') as string,
      name_hebrew: (raw['name_hebrew'] as string)?.trim() ?? '',
      ingredients_: ingredients,
      steps_: steps,
      yield_amount_: yieldAmount,
      yield_unit_: yieldUnit,
      ...(yieldConversions.length > 0 ? { yield_conversions_: yieldConversions } : {}),
      default_station_: '',
      is_approved_: isApproved,
      recipe_type_: isDish ? 'dish' : 'preparation',
      labels_: labels,
      ...(prepItems && prepItems.length > 0 && { prep_items_: prepItems }),
      ...(prepCategories && prepCategories.length > 0 && { prep_categories_: prepCategories }),
      ...(() => {
        const baselineRaw = (raw['logistics'] as { baseline_?: { equipment_id_: string; quantity_: number; phase_: string; is_critical_: boolean; notes_?: string }[] })?.baseline_ ?? []
        const baseline = baselineRaw
          .filter((r: { equipment_id_?: string }) => !!r?.equipment_id_)
          .map((r: { equipment_id_: string; quantity_: number; phase_: string; is_critical_: boolean; notes_?: string }) => ({
            equipment_id_: r.equipment_id_,
            quantity_: Number(r.quantity_),
            phase_: (r.phase_ || 'both') as EquipmentPhase,
            is_critical_: !!r.is_critical_,
            notes_: r.notes_ || undefined
          }))
        return baseline.length > 0 ? { logistics_: { baseline_: baseline } } : {}
      })()
    }
  }

  /**
   * Patch form and rebuild all FormArrays from a Recipe snapshot.
   * Caller must set isApproved_ signal separately before invoking this.
   */
  patchFormFromRecipe(form: FormGroup, recipe: Recipe): void {
    const isDish = recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length)
    const normalizedLabels = this.normalizeLabelKeys(recipe.labels_ ?? [])
    form.patchValue({
      name_hebrew: recipe.name_hebrew,
      recipe_type: isDish ? 'dish' : 'preparation',
      serving_portions: isDish ? recipe.yield_amount_ : 1,
      total_weight_g: 0,
      total_cost: 0,
      labels: normalizedLabels
    })

    const yieldArr = form.get('yield_conversions') as FormArray
    const conversions = recipe.yield_conversions_?.length
      ? recipe.yield_conversions_
      : [{ amount: recipe.yield_amount_, unit: isDish ? 'dish' : recipe.yield_unit_ }]
    while (yieldArr.length > 0) yieldArr.removeAt(0)
    conversions.forEach((c, i) => {
      const amount = isDish && i === 0 ? recipe.yield_amount_ : (c.amount ?? 0)
      const unit = isDish && i === 0 ? 'dish' : (c.unit ?? 'gram')
      yieldArr.push(this.fb.group({ amount: [amount], unit: [unit] }))
    })
    if (yieldArr.length === 0) {
      yieldArr.push(this.fb.group({ amount: [recipe.yield_amount_], unit: [isDish ? 'dish' : recipe.yield_unit_] }))
    }

    const ingredientsArr = form.get('ingredients') as FormArray
    ingredientsArr.clear()
    recipe.ingredients_.forEach(ing => {
      const item = this.state.products_().find(p => p._id === ing.referenceId)
        ?? this.state.recipes_().find(r => r._id === ing.referenceId)
      const itemForGroup = item
        ? {
            _id: ing.referenceId,
            name_hebrew: item.name_hebrew,
            item_type_: ing.type,
            base_unit_: (item as { base_unit_?: string }).base_unit_ ?? ing.unit_,
            yield_percentage: 1
          }
        : null
      ingredientsArr.push(
        this.createIngredientGroup(itemForGroup as { _id: string; name_hebrew: string; item_type_: string; base_unit_: string; yield_percentage?: number } | null)
      )
      const lastGroup = ingredientsArr.at(ingredientsArr.length - 1)
      lastGroup.patchValue({
        referenceId: ing.referenceId,
        item_type: ing.type,
        amount_net: ing.amount_,
        unit: ing.unit_,
        total_cost: ing.calculatedCost_ ?? this.recipeCost.getCostForIngredient(ing)
      })
    })

    const workflowArr = form.get('workflow_items') as FormArray
    workflowArr.clear()
    if (isDish) {
      const prepRows = this.getPrepRowsFromRecipe(recipe)
      if (prepRows.length > 0) {
        prepRows.forEach(row => workflowArr.push(this.createPrepItemRow(row)))
      } else {
        workflowArr.push(this.createPrepItemRow())
      }
    } else {
      recipe.steps_.forEach((step, i) => {
        const group = this.createStepGroup(step.order_ ?? i + 1)
        group.patchValue({
          instruction: step.instruction_,
          labor_time: step.labor_time_minutes_ ?? 0
        })
        workflowArr.push(group)
      })
    }

    if (recipe.logistics_?.baseline_?.length) {
      const logisticsArr = (form.get('logistics') as FormGroup)?.get('baseline_') as FormArray
      logisticsArr.clear()
      recipe.logistics_.baseline_.forEach(entry => logisticsArr.push(this.createBaselineRow(entry)))
    }
  }

  // ─── Auto Labels ─────────────────────────────────────────────────

  /** Compute auto-applied labels from recipe ingredients (product categories + allergens). */
  computeAutoLabels(recipe: Recipe): string[] {
    const productIds = recipe.ingredients_
      .filter(ing => ing.type === 'product')
      .map(ing => ing.referenceId)
    const products = this.state.products_().filter(p => productIds.includes(p._id))
    const triggerSet = new Set<string>()
    products.forEach(p => {
      ;(p.categories_ ?? []).forEach(c => triggerSet.add(c))
      ;(p.allergens_ ?? []).forEach(a => triggerSet.add(a))
    })
    return this.metadataRegistry.allLabels_()
      .filter(def => def.autoTriggers?.some(t => triggerSet.has(t)))
      .map(def => def.key)
  }

  // ─── Weight / Volume ─────────────────────────────────────────────

  computeWeightsAndVolumes(form: FormGroup): {
    totalWeightG: number
    totalBrutoWeightG: number
    totalVolumeL: number
    totalVolumeMl: number
    unconvertibleForWeight: string[]
    unconvertibleForVolume: string[]
  } {
    const raw = form.getRawValue() as {
      ingredients?: { amount_net?: number; unit?: string; referenceId?: string; item_type?: string; name_hebrew?: string }[]
    }
    const rows = raw?.ingredients || []
    const totalWeightG = Math.round(this.recipeCost.computeTotalWeightG(rows))
    const totalBrutoWeightG = Math.round(this.recipeCost.computeTotalBrutoWeightG(rows))
    const vol = this.recipeCost.computeTotalVolumeL(rows)
    return {
      totalWeightG,
      totalBrutoWeightG,
      totalVolumeL: vol.totalL,
      totalVolumeMl: vol.totalL * 1000,
      unconvertibleForWeight: this.recipeCost.getUnconvertibleNamesForWeight(rows),
      unconvertibleForVolume: vol.unconvertibleNames
    }
  }
}
