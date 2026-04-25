import { Injectable, inject } from '@angular/core'
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MenuSectionCategoriesService } from '@services/menu-section-categories.service'
import type { AiMenuDraft, AiMenuPatch, MatchedDish, MatchedMenu, MatchedSection } from '@models/ai-menu-draft.model'
import { matchRecipeName } from '../../../core/utils/recipe-match.util'

export interface MenuAiFormRefs {
  menuForm: FormGroup
}

@Injectable()
export class MenuAiFlowService {
  private readonly fb_ = inject(FormBuilder)
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly menuSectionCategories_ = inject(MenuSectionCategoriesService)

  private refs_: MenuAiFormRefs | null = null

  private get sectionsArray_(): FormArray<FormGroup> {
    return this.refs_!.menuForm.get('sections_') as FormArray<FormGroup>
  }

  init(refs: MenuAiFormRefs): void {
    this.refs_ = refs
  }

  runMatching(draft: AiMenuDraft): MatchedMenu {
    const recipes = this.kitchenState_.recipes_()

    const sections: MatchedSection[] = draft.sections_.map((section) => {
      const items: MatchedDish[] = section.items.map((dish) => {
        const { bestMatch, candidates, status } = matchRecipeName(dish.name_hebrew, recipes)
        return {
          name_hebrew: dish.name_hebrew,
          status,
          recipeId: status === 'matched' ? (bestMatch?.recipeId ?? null) : null,
          candidates,
          predictedTakeRate: dish.predicted_take_rate_,
          servingPortions: dish.serving_portions,
          sellPrice: dish.sell_price,
        }
      })
      return { category: section.category, items }
    })

    return {
      name_: draft.name_,
      event_type_: draft.event_type_,
      event_date_: draft.event_date_,
      serving_type_: draft.serving_type_,
      guest_count_: draft.guest_count_,
      sections,
    }
  }

  applyMatchedMenu(matched: MatchedMenu, resolutions: Map<string, string | 'skip'>): void {
    if (!this.refs_) return
    const form = this.refs_.menuForm
    const sectionsArray = this.sectionsArray_

    // Patch top-level fields
    form.patchValue({
      name_: matched.name_,
      event_type_: matched.event_type_,
      event_date_: matched.event_date_ ?? null,
      serving_type_: matched.serving_type_,
      guest_count_: matched.guest_count_,
    })

    // Rebuild sections from scratch
    while (sectionsArray.length > 0) {
      sectionsArray.removeAt(0)
    }

    matched.sections.forEach((section, sectionIndex) => {
      const itemsArray = this.fb_.array<FormGroup>([])

      section.items.forEach((dish) => {
        const dishKey = `${sectionIndex}:${dish.name_hebrew}`
        const resolution = resolutions.get(dishKey)

        // Skip if explicitly skipped
        if (resolution === 'skip') return

        // Determine recipe_id_
        let recipeId: string | null = null
        if (resolution && resolution !== 'skip') {
          recipeId = resolution
        } else if (dish.status === 'matched') {
          recipeId = dish.recipeId
        }
        // unmatched/ambiguous without resolution → create placeholder row with empty recipe_id_

        const itemGroup = this.fb_.group({
          recipe_id_: [recipeId ?? '', Validators.required],
          recipe_type_: ['dish'],
          predicted_take_rate_: [dish.predictedTakeRate ?? 0.4, [Validators.required, Validators.min(0), Validators.max(1)]],
          sell_price: [dish.sellPrice ?? 0],
          food_cost_money: [0],
          food_cost_pct: [0],
          serving_portions: [dish.servingPortions ?? 1],
          serving_portions_pct: [0],
        })

        itemsArray.push(itemGroup)
      })

      const sectionGroup = this.fb_.group({
        _id: [crypto.randomUUID()],
        name_: [section.category],
        sort_order_: [sectionIndex + 1],
        items_: itemsArray,
      })

      sectionsArray.push(sectionGroup)
    })
  }

  applyPatch(patch: AiMenuPatch): void {
    if (!this.refs_) return
    const form = this.refs_.menuForm

    const topLevelPatch: Record<string, unknown> = {}
    if (patch.name_ !== undefined) topLevelPatch['name_'] = patch.name_
    if (patch.event_type_ !== undefined) topLevelPatch['event_type_'] = patch.event_type_
    if (patch.event_date_ !== undefined) topLevelPatch['event_date_'] = patch.event_date_
    if (patch.serving_type_ !== undefined) topLevelPatch['serving_type_'] = patch.serving_type_
    if (patch.guest_count_ !== undefined) topLevelPatch['guest_count_'] = patch.guest_count_

    if (Object.keys(topLevelPatch).length > 0) {
      form.patchValue(topLevelPatch)
    }

    if (patch.sections_ !== undefined) {
      // Re-run matching on the patched sections, then apply
      const draftForMatching: AiMenuDraft = {
        name_: (form.get('name_')?.value as string) ?? '',
        event_type_: (form.get('event_type_')?.value as string) ?? '',
        event_date_: (form.get('event_date_')?.value as string | null) ?? null,
        serving_type_: (form.get('serving_type_')?.value as string) ?? '',
        guest_count_: (form.get('guest_count_')?.value as number) ?? 0,
        sections_: patch.sections_,
      }
      const matched = this.runMatching(draftForMatching)
      this.applyMatchedMenu(matched, new Map())
    }
  }
}
