import { Injectable, WritableSignal, inject } from '@angular/core'
import { FormArray, FormBuilder, FormGroup } from '@angular/forms'
import { KitchenStateService } from '@services/kitchen-state.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { EquipmentDataService } from '@services/equipment-data.service'
import { RecipeFormService } from './recipe-form.service'
import { AiRecipeDraftService, type AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { AiRecipeModalService } from '../../../shared/ai-recipe-modal/ai-recipe-modal.service'
import type { AiRecipePatch } from '@services/gemini.service'
import type { Equipment } from '@models/equipment.model'

export interface RecipeAiFormRefs {
  recipeForm: FormGroup
  ingredientsFormVersion_: WritableSignal<number>
  addNewIngredientRow: () => void
}

@Injectable()
export class RecipeAiFlowService {
  private readonly fb_ = inject(FormBuilder)
  private readonly state_ = inject(KitchenStateService)
  private readonly unitRegistry_ = inject(UnitRegistryService)
  private readonly equipmentData_ = inject(EquipmentDataService)
  private readonly recipeFormService_ = inject(RecipeFormService)
  private readonly aiRecipeDraft_ = inject(AiRecipeDraftService)
  private readonly aiModal_ = inject(AiRecipeModalService)

  private refs_: RecipeAiFormRefs | null = null

  // Derived form array getters — computed from the bound recipeForm each call
  private get ingredientsArray(): FormArray {
    return this.refs_!.recipeForm.get('ingredients') as FormArray
  }
  private get workflowArray(): FormArray {
    return this.refs_!.recipeForm.get('workflow_items') as FormArray
  }
  private get yieldConversionsArray(): FormArray {
    return this.refs_!.recipeForm.get('yield_conversions') as FormArray
  }
  private get logisticsBaselineArray(): FormArray {
    return (this.refs_!.recipeForm.get('logistics') as FormGroup)?.get('baseline_') as FormArray
  }

  /** Call once from RecipeBuilderPage ngOnInit before any AI operation. */
  init(refs: RecipeAiFormRefs): void {
    this.refs_ = refs
  }

  /**
   * Checks for a pending AI draft (cross-page handoff from AI modal).
   * Returns true if a draft was found and applied to the form.
   */
  applyPendingDraft(): boolean {
    const draft = this.aiRecipeDraft_.consume()
    if (!draft) return false
    this.prefillFromDraft(draft)
    return true
  }

  /** Opens the AI edit modal with the current form state as context. */
  openEditModal(): void {
    const snapshot = this.buildDraftSnapshot()
    this.aiModal_.open('edit', snapshot, (patch) => this.applyPatch(patch))
  }

  // ─── Private: form mutation ────────────────────────────────────────

  private prefillFromDraft(draft: AiRecipeDraft): void {
    const { recipeForm } = this.refs_!
    const isDish = draft.recipe_type === 'dish'

    recipeForm.patchValue({ recipe_type: draft.recipe_type })
    recipeForm.patchValue({ name_hebrew: draft.name_hebrew }, { emitEvent: false })

    this.yieldConversionsArray.clear()
    if (isDish) {
      recipeForm.patchValue({ serving_portions: draft.yield_amount }, { emitEvent: false })
      this.yieldConversionsArray.push(this.fb_.group({ amount: [draft.yield_amount], unit: ['dish'] }))
    } else {
      this.yieldConversionsArray.push(this.fb_.group({ amount: [draft.yield_amount], unit: [draft.yield_unit] }))
    }

    this.ingredientsArray.clear()
    for (const ing of draft.ingredients) {
      this.ingredientsArray.push(this.recipeFormService_.createIngredientGroup())
      const last = this.ingredientsArray.at(this.ingredientsArray.length - 1)
      const knownUnits = new Set(this.unitRegistry_.allUnitKeys_())
      const safeUnit = knownUnits.has(ing.unit) ? ing.unit : 'unit'
      const matched = this.findIngredientMatch_(ing.name)
      last.patchValue({
        name_hebrew: ing.name,
        amount_net: ing.amount,
        unit: safeUnit,
        ...(matched && { referenceId: matched.entity._id, item_type: matched.type }),
      })
    }

    this.workflowArray.clear()
    if (isDish) {
      for (const step of draft.steps) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow({ preparation_name: step }))
      }
      if (this.workflowArray.length === 0) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow())
      }
    } else {
      draft.steps.forEach((step, i) => {
        const group = this.recipeFormService_.createStepGroup(i + 1)
        group.patchValue({ instruction: step })
        this.workflowArray.push(group)
      })
      if (this.workflowArray.length === 0) {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1))
      }
    }

    if (draft.equipment?.length) {
      this.logisticsBaselineArray.clear()
      for (const item of draft.equipment) {
        const matched = this.findEquipmentMatch_(item.name)
        this.logisticsBaselineArray.push(
          this.recipeFormService_.createBaselineRow({
            equipment_id_: matched?._id ?? '',
            quantity_: item.quantity,
            phase_: 'both',
            is_critical_: true,
            name_hebrew_: matched ? '' : item.name,
          } as any)
        )
      }
    }
  }

  private buildDraftSnapshot(): AiRecipeDraft {
    const { recipeForm } = this.refs_!
    const formVal = recipeForm.getRawValue()
    const isDish = formVal.recipe_type === 'dish'
    const primaryYield = this.yieldConversionsArray.at(0)?.getRawValue() ?? { amount: 0, unit: 'gram' }

    const ingredients = (this.ingredientsArray.controls as FormGroup[])
      .map(g => g.getRawValue())
      .filter(v => v.name_hebrew)
      .map(v => ({ name: v.name_hebrew as string, amount: (v.amount_net as number) ?? 0, unit: (v.unit as string) ?? 'unit' }))

    const steps = (this.workflowArray.controls as FormGroup[])
      .map(g => g.getRawValue())
      .map(v => (v.instruction as string | undefined) ?? (v.preparation_name as string | undefined) ?? '')
      .filter(s => s.length > 0)

    const equipment = (this.logisticsBaselineArray.controls as FormGroup[])
      .map(g => g.getRawValue())
      .filter(v => v.equipment_id_)
      .map(v => {
        const eq = this.equipmentData_.allEquipment_().find(
          e => e._id === v.equipment_id_ || (e as any)._masterId === v.equipment_id_
        )
        return { name: eq?.name_hebrew ?? v.equipment_id_, quantity: v.quantity_ as number }
      })

    return {
      name_hebrew: formVal.name_hebrew ?? '',
      recipe_type: isDish ? 'dish' : 'preparation',
      yield_amount: primaryYield.amount,
      yield_unit: primaryYield.unit,
      ingredients,
      steps,
      ...(equipment.length > 0 ? { equipment } : {}),
    }
  }

  private applyPatch(patch: AiRecipePatch): void {
    const { recipeForm, ingredientsFormVersion_, addNewIngredientRow } = this.refs_!
    const isDish = (recipeForm.get('recipe_type')?.value as string) === 'dish'

    if (patch.name_hebrew !== undefined) {
      recipeForm.patchValue({ name_hebrew: patch.name_hebrew }, { emitEvent: false })
    }

    if (patch.yield_amount !== undefined || patch.yield_unit !== undefined) {
      const primary = this.yieldConversionsArray.at(0)
      if (primary) {
        if (patch.yield_amount !== undefined) primary.patchValue({ amount: patch.yield_amount }, { emitEvent: false })
        if (patch.yield_unit !== undefined) primary.patchValue({ unit: patch.yield_unit }, { emitEvent: false })
      }
    }

    if (patch.ingredients !== undefined) {
      this.ingredientsArray.clear()
      for (const ing of patch.ingredients) {
        this.ingredientsArray.push(this.recipeFormService_.createIngredientGroup())
        const last = this.ingredientsArray.at(this.ingredientsArray.length - 1)
        const knownUnits = new Set(this.unitRegistry_.allUnitKeys_())
        const safeUnit = knownUnits.has(ing.unit) ? ing.unit : 'unit'
        const matched = this.findIngredientMatch_(ing.name)
        last.patchValue({
          name_hebrew: ing.name,
          amount_net: ing.amount,
          unit: safeUnit,
          ...(matched && { referenceId: matched.entity._id, item_type: matched.type }),
        })
      }
      if (this.ingredientsArray.length === 0) addNewIngredientRow()
      ingredientsFormVersion_.update(v => v + 1)
    }

    if (patch.steps !== undefined) {
      this.workflowArray.clear()
      if (isDish) {
        for (const step of patch.steps) {
          this.workflowArray.push(this.recipeFormService_.createPrepItemRow({ preparation_name: step }))
        }
        if (this.workflowArray.length === 0) {
          this.workflowArray.push(this.recipeFormService_.createPrepItemRow())
        }
      } else {
        patch.steps.forEach((step, i) => {
          const group = this.recipeFormService_.createStepGroup(i + 1)
          group.patchValue({ instruction: step })
          this.workflowArray.push(group)
        })
        if (this.workflowArray.length === 0) {
          this.workflowArray.push(this.recipeFormService_.createStepGroup(1))
        }
      }
    }

    if (patch.equipment !== undefined) {
      this.logisticsBaselineArray.clear()
      for (const item of patch.equipment) {
        const matched = this.findEquipmentMatch_(item.name)
        this.logisticsBaselineArray.push(
          this.recipeFormService_.createBaselineRow({
            equipment_id_: matched?._id ?? '',
            quantity_: item.quantity,
            phase_: 'both',
            is_critical_: true,
            name_hebrew_: matched ? '' : item.name,
          } as any)
        )
      }
    }

    this.applyJustFilledHighlight_()
  }

  private applyJustFilledHighlight_(): void {
    const el = document.querySelector('.recipe-builder-container') as HTMLElement | null
    el?.classList.add('just-filled')
    setTimeout(() => el?.classList.remove('just-filled'), 1500)
  }

  private findIngredientMatch_(name: string): { entity: { _id: string }; type: 'product' | 'recipe' } | null {
    const norm = (s: string) => s.trim().toLowerCase()
    const q = norm(name)
    const product = this.state_.products_().find(p => norm(p.name_hebrew) === q)
    if (product) return { entity: product, type: 'product' }
    const recipe = this.state_.recipes_().find(r => norm(r.name_hebrew) === q)
    if (recipe) return { entity: recipe, type: 'recipe' }
    return null
  }

  private findEquipmentMatch_(name: string): Equipment | null {
    const norm = (s: string) => s.trim().toLowerCase()
    const q = norm(name)
    return this.equipmentData_.allEquipment_().find(e => norm(e.name_hebrew) === q) ?? null
  }
}
