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
  nameHebrew?: string
  item_type_?: string
  baseUnit?: string
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

  /** Require amount > 0 when referenceId or nameHebrew is set; empty rows are valid. */
  ingredientRowValidator(control: AbstractControl): ValidationErrors | null {
    const refId = control.get('referenceId')?.value
    const name = control.get('nameHebrew')?.value?.trim()
    if (!refId && !name) return null
    const amount = control.get('amount_net')?.value
    if (amount == null || amount === '') return { required: true }
    const numAmt = typeof amount === 'number' ? amount : Number(amount)
    if (isNaN(numAmt) || numAmt <= 0) return { min: true }
    return null
  }

  /** Requires at least one ingredient with product/recipe selected or unlinked name, and quantity > 0. */
  recipeFormValidator(control: AbstractControl): ValidationErrors | null {
    const ingredients = (control.get('ingredients')?.value || []) as {
      referenceId?: string
      amount_net?: number | string
      nameHebrew?: string
    }[]
    const hasValid = ingredients.some((ing) => {
      const amt = ing.amount_net
      const num = typeof amt === 'number' ? amt : Number(amt)
      const hasAmount = amt != null && amt !== '' && !isNaN(num) && num > 0
      if (ing?.referenceId && hasAmount) return true
      if (!ing?.referenceId && ing?.nameHebrew?.trim() && hasAmount) return true
      return false
    })
    return hasValid ? null : { atLeastOneIngredient: true }
  }

  // ─── Form Group Factories ─────────────────────────────────────────

  createIngredientGroup(item: IngredientRowItem | null = null): FormGroup {
    return this.fb.group(
      {
        referenceId: [item?._id ?? null],
        item_type: [item?.item_type_ ?? null],
        nameHebrew: [item?.nameHebrew ?? ''],
        nameSnapshot: [item?.nameHebrew ?? ''],
        amount_net: [item ? 1 : null, [Validators.min(0)]],
        yield_percentage: [item?.yield_percentage ?? 1],
        unit: [item?.baseUnit ?? 'gram'],
        total_cost: [0]
      },
      { validators: (c) => this.ingredientRowValidator(c) }
    )
  }

  createStepGroup(order: number): FormGroup {
    return this.fb.group({
      order: [order],
      instruction: [''],
      labor_time: [0],
      cooking_time: [0]
    })
  }

  createPrepItemRow(row?: {
    preparationName?: string
    categoryName?: string
    mainCategoryName?: string
    quantity?: number
    unit?: string
  }): FormGroup {
    const units = this.unitRegistry.allUnitKeys_()
    const defaultUnit = units[0] ?? 'unit'
    return this.fb.group({
      preparationName: [row?.preparationName ?? ''],
      categoryName: [row?.categoryName ?? ''],
      mainCategoryName: [row?.mainCategoryName ?? ''],
      quantity: [row?.quantity ?? 1, [Validators.min(0)]],
      unit: [row?.unit ?? defaultUnit, Validators.required]
    })
  }

  createBaselineRow(entry?: BaselineEntry & { name_hebrew_?: string }): FormGroup {
    return this.fb.group({
      equipmentId: [entry?.equipmentId ?? '', Validators.required],
      quantity: [entry?.quantity ?? 1, [Validators.required, Validators.min(0)]],
      phase: [entry?.phase ?? 'both'],
      isCritical: [entry?.isCritical ?? true],
      notes: [entry?.notes ?? ''],
      name_hebrew_: [entry?.name_hebrew_ ?? '']
    })
  }

  // ─── Pure Helpers ─────────────────────────────────────────────────

  getPrepRowsFromRecipe(
    recipe: Recipe
  ): { preparationName: string; categoryName: string; mainCategoryName: string; quantity: number; unit: string }[] {
    if (recipe.prepItems?.length) {
      return recipe.prepItems.map((p) => ({
        preparationName: p.preparationName,
        categoryName: p.categoryName,
        mainCategoryName: p.mainCategoryName ?? p.categoryName,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? 'unit'
      }))
    }
    if (recipe.prepCategories?.length) {
      const rows: {
        preparationName: string
        categoryName: string
        mainCategoryName: string
        quantity: number
        unit: string
      }[] = []
      recipe.prepCategories.forEach((cat) => {
        ;(cat.items ?? []).forEach((it) => {
          rows.push({
            preparationName: it.itemName,
            categoryName: cat.categoryName,
            mainCategoryName: cat.categoryName,
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
    const registryKeys = new Set(this.metadataRegistry.allLabels_().map((def) => def.key))
    return rawLabels
      .map((label) => {
        const trimmed = (label ?? '').trim()
        if (!trimmed) return null
        if (registryKeys.has(trimmed)) return trimmed
        const labelDisplay = this.translation.translate(trimmed)
        const match = this.metadataRegistry
          .allLabels_()
          .find((def) => this.translation.translate(def.key) === labelDisplay)
        return match ? match.key : null
      })
      .filter((k): k is string => k != null)
  }

  // ─── Build / Patch ────────────────────────────────────────────────

  buildRecipeFromForm(form: FormGroup, recipeId: string | null, isApproved: boolean): Recipe {
    const raw = form.getRawValue() as Record<string, unknown>
    const isDish = raw['recipe_type'] === 'dish'

    type IngRow = {
      referenceId?: string
      item_type?: string
      amount_net?: number
      unit?: string
      total_cost?: number
      nameSnapshot?: string
      nameHebrew?: string
    }
    const rawIngredients = (raw['ingredients'] || []) as IngRow[]
    const ingredients: Ingredient[] = rawIngredients
      .filter((ing) => {
        if (ing?.referenceId) return true
        if (ing?.nameHebrew?.trim() && (ing.amount_net ?? 0) > 0) return true
        return false
      })
      .map((ing) => ({
        _id: 'ing_' + Math.random().toString(36).slice(2, 9),
        ...(ing.referenceId ? { referenceId: ing.referenceId } : {}),
        ...(ing.referenceId
          ? { type: (ing.item_type === 'recipe' ? 'recipe' : 'product') as 'product' | 'recipe' }
          : {}),
        amount: ing.amount_net ?? 0,
        unit: ing.unit ?? '',
        calculatedCost: ing.referenceId ? (ing.total_cost ?? 0) : 0,
        nameSnapshot: ing.nameSnapshot || ing.nameHebrew || ''
      }))

    const steps: RecipeStep[] = []
    let prepItems: FlatPrepItem[] | undefined
    let prepCategories: PrepCategory[] | undefined

    if (isDish) {
      type PrepRow = {
        preparationName?: string
        categoryName?: string
        mainCategoryName?: string
        quantity?: number | string
        unit?: string
      }
      const rows = (raw['workflow_items'] || []) as PrepRow[]
      prepItems = rows
        .filter((r) => !!r?.preparationName?.trim())
        .map((r) => {
          const qty = typeof r.quantity === 'number' ? r.quantity : Number(r.quantity) || 1
          const item: FlatPrepItem = {
            preparationName: r.preparationName ?? '',
            categoryName: r.categoryName ?? '',
            quantity: qty,
            unit: r.unit ?? 'unit'
          }
          if (r.mainCategoryName !== undefined && r.mainCategoryName !== '') {
            item.mainCategoryName = r.mainCategoryName
          }
          return item
        })

      const byCategory = new Map<string, { itemName: string; unit: string; quantity?: number }[]>()
      prepItems.forEach((p) => {
        const list = byCategory.get(p.categoryName) ?? []
        list.push({ itemName: p.preparationName, unit: p.unit, quantity: p.quantity })
        byCategory.set(p.categoryName, list)
      })
      prepCategories = Array.from(byCategory.entries()).map(([categoryName, items]) => ({
        categoryName,
        items: items.map((it) => ({ itemName: it.itemName, unit: it.unit }))
      }))
    } else {
      type StepRow = { order?: number; instruction?: string; labor_time?: number; cooking_time?: number }
      const stepRows = (raw['workflow_items'] || []) as StepRow[]
      stepRows
        .filter((s) => !!s?.instruction?.trim())
        .forEach((step, i) => {
          steps.push({
            order: step?.order ?? i + 1,
            instruction: step?.instruction ?? '',
            laborTimeMinutes: step?.labor_time ?? 0,
            cookingTimeSecs: step?.cooking_time ?? 0
          })
        })
    }

    const yieldConvRows = (raw['yield_conversions'] as { amount?: number; unit?: string }[] | undefined) ?? []
    const yieldConv = yieldConvRows[0]
    const yieldAmount = isDish ? ((raw['serving_portions'] as number) ?? 1) : (yieldConv?.amount ?? 0)
    const yieldUnit = isDish ? 'מנה' : (yieldConv?.unit ?? 'gram')
    const yieldConversions = yieldConvRows
      .filter((r) => r?.unit != null && r.unit !== '')
      .map((r) => ({ amount: Number(r?.amount ?? 0), unit: String(r.unit) }))

    const rawLabels = (raw['labels'] as string[] | undefined) ?? []
    const labels = this.normalizeLabelKeys(rawLabels)

    const rawCourse = ((raw['course'] as string | undefined) ?? '').trim()
    const course = this.metadataRegistry.courses_().some((c) => c.key === rawCourse) ? rawCourse : ''

    return {
      _id: (recipeId ?? '') as string,
      nameHebrew: (raw['nameHebrew'] as string)?.trim() ?? '',
      ingredients: ingredients,
      steps: steps,
      yieldAmount: yieldAmount,
      yieldUnit: yieldUnit,
      ...(yieldConversions.length > 0 ? { yieldConversions: yieldConversions } : {}),
      defaultStation: '',
      isApproved: isApproved,
      recipeType: isDish ? 'dish' : 'preparation',
      labels: labels,
      course: course,
      ...(prepItems && prepItems.length > 0 && { prepItems: prepItems }),
      ...(prepCategories && prepCategories.length > 0 && { prepCategories: prepCategories }),
      ...(() => {
        const baselineRaw =
          (
            raw['logistics'] as {
              baseline?: {
                equipmentId: string
                quantity: number
                phase: string
                isCritical: boolean
                notes?: string
              }[]
            }
          )?.baseline ?? []
        const baseline = baselineRaw
          .filter((r: { equipmentId?: string }) => !!r?.equipmentId)
          .map((r: { equipmentId: string; quantity: number; phase: string; isCritical: boolean; notes?: string }) => ({
            equipmentId: r.equipmentId,
            quantity: Number(r.quantity),
            phase: (r.phase || 'both') as EquipmentPhase,
            isCritical: !!r.isCritical,
            notes: r.notes || undefined
          }))
        // Always sent, even empty: the server merges a PUT over the stored doc, so leaving it
        // out keeps a legacy `logistics: null` (schema 400) or the tools the user just removed.
        return { logistics: { baseline: baseline } }
      })()
    }
  }

  /**
   * Patch form and rebuild all FormArrays from a Recipe snapshot.
   * Caller must set isApproved_ signal separately before invoking this.
   */
  patchFormFromRecipe(form: FormGroup, recipe: Recipe): void {
    const isDish = recipe.recipeType === 'dish' || !!(recipe.prepItems?.length || recipe.prepCategories?.length)
    const normalizedLabels = this.normalizeLabelKeys(recipe.labels ?? [])
    form.patchValue(
      {
        nameHebrew: recipe.nameHebrew,
        recipe_type: isDish ? 'dish' : 'preparation',
        serving_portions: isDish ? recipe.yieldAmount : 1,
        total_weight_g: 0,
        total_cost: 0,
        labels: normalizedLabels,
        course: recipe.course ?? ''
      },
      { emitEvent: false }
    )

    const yieldArr = form.get('yield_conversions') as FormArray
    const conversions = recipe.yieldConversions?.length
      ? recipe.yieldConversions
      : [{ amount: recipe.yieldAmount, unit: isDish ? 'dish' : recipe.yieldUnit }]
    while (yieldArr.length > 0) yieldArr.removeAt(0)
    conversions.forEach((c, i) => {
      const amount = isDish && i === 0 ? recipe.yieldAmount : (c.amount ?? 0)
      const unit = isDish && i === 0 ? 'dish' : (c.unit ?? 'gram')
      yieldArr.push(this.fb.group({ amount: [amount], unit: [unit] }))
    })
    if (yieldArr.length === 0) {
      yieldArr.push(this.fb.group({ amount: [recipe.yieldAmount], unit: [isDish ? 'dish' : recipe.yieldUnit] }))
    }

    const ingredientsArr = form.get('ingredients') as FormArray
    ingredientsArr.clear()
    recipe.ingredients.forEach((ing) => {
      let item =
        this.state.products_().find((p) => p._id === ing.referenceId) ??
        this.state.recipes_().find((r) => r._id === ing.referenceId)
      let resolvedRefId = ing.referenceId
      let resolvedType = ing.type
      // Auto-repair by nameSnapshot: covers two cases —
      //   A) referenceId was null (saved as unlinked draft via clearIngredient)
      //   B) referenceId is set but product was deleted/replaced (orphaned reference)
      // In both cases, if nameSnapshot matches a current product/recipe name, restore the link.
      if (!item && ing.nameSnapshot) {
        const byName =
          this.state.products_().find((p) => p.nameHebrew === ing.nameSnapshot) ??
          this.state.recipes_().find((r) => r.nameHebrew === ing.nameSnapshot)
        if (byName) {
          item = byName
          resolvedRefId = byName._id
          resolvedType = 'baseUnit' in byName ? 'product' : 'recipe'
        }
      }
      // If item still not resolved (orphaned referenceId + no nameSnapshot) — clear
      // resolvedRefId so isUnlinkedRow() fires and the badge prompts the user to re-link.
      if (!item && resolvedRefId) {
        resolvedRefId = undefined
        resolvedType = undefined
      }
      const itemForGroup = item
        ? {
            _id: resolvedRefId,
            nameHebrew: item.nameHebrew,
            item_type_: resolvedType,
            baseUnit: (item as { baseUnit?: string }).baseUnit ?? ing.unit,
            yield_percentage: 1
          }
        : null

      ingredientsArr.push(
        this.createIngredientGroup(
          itemForGroup as {
            _id: string
            nameHebrew: string
            item_type_: string
            baseUnit: string
            yield_percentage?: number
          } | null
        )
      )
      const lastGroup = ingredientsArr.at(ingredientsArr.length - 1)
      lastGroup.patchValue({
        referenceId: resolvedRefId,
        item_type: resolvedType,
        nameHebrew: item?.nameHebrew ?? (ing as { name_hebrew_?: string }).name_hebrew_ ?? ing.nameSnapshot ?? '',
        nameSnapshot: ing.nameSnapshot ?? item?.nameHebrew ?? '',
        amount_net: ing.amount,
        unit: ing.unit,
        total_cost: ing.calculatedCost ?? this.recipeCost.getCostForIngredient(ing)
      })
    })

    const workflowArr = form.get('workflow_items') as FormArray
    workflowArr.clear()
    if (isDish) {
      const prepRows = this.getPrepRowsFromRecipe(recipe)
      if (prepRows.length > 0) {
        prepRows.forEach((row) => workflowArr.push(this.createPrepItemRow(row)))
      } else {
        workflowArr.push(this.createPrepItemRow())
      }
    } else {
      recipe.steps.forEach((step, i) => {
        const group = this.createStepGroup(step.order ?? i + 1)
        group.patchValue({
          instruction: step.instruction,
          labor_time: step.laborTimeMinutes ?? 0,
          cooking_time: step.cookingTimeSecs ?? 0
        })
        workflowArr.push(group)
      })
    }

    if (recipe.logistics?.baseline?.length) {
      const logisticsArr = (form.get('logistics') as FormGroup)?.get('baseline') as FormArray
      logisticsArr.clear()
      recipe.logistics.baseline.forEach((entry) => logisticsArr.push(this.createBaselineRow(entry)))
    }
  }

  // ─── Auto Labels ─────────────────────────────────────────────────

  /** Compute auto-applied labels from recipe ingredients (product categories + allergens). */
  computeAutoLabels(recipe: Recipe): string[] {
    const productIds = recipe.ingredients.filter((ing) => ing.type === 'product').map((ing) => ing.referenceId)
    const products = this.state.products_().filter((p) => productIds.includes(p._id))
    const triggerSet = new Set<string>()
    products.forEach((p) => {
      ;(p.categories ?? []).forEach((c) => triggerSet.add(c))
      ;(p.allergens ?? []).forEach((a) => triggerSet.add(a))
    })
    return this.metadataRegistry
      .allLabels_()
      .filter((def) => def.autoTriggers?.some((t) => triggerSet.has(t)))
      .map((def) => def.key)
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
      ingredients?: {
        amount_net?: number
        unit?: string
        referenceId?: string
        item_type?: string
        nameHebrew?: string
      }[]
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
