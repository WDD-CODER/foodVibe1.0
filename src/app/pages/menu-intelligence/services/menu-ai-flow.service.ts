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
    return this.refs_!.menuForm.get('sections') as FormArray<FormGroup>
  }

  init(refs: MenuAiFormRefs): void {
    this.refs_ = refs
  }

  runMatching(draft: AiMenuDraft): MatchedMenu {
    const recipes = this.kitchenState_.recipes_()

    const sections: MatchedSection[] = draft.sections.map((section) => {
      const items: MatchedDish[] = section.items.map((dish) => {
        const { bestMatch, candidates, status } = matchRecipeName(dish.nameHebrew, recipes)
        return {
          nameHebrew: dish.nameHebrew,
          status,
          recipeId: status === 'matched' ? (bestMatch?.recipeId ?? null) : null,
          candidates,
          predictedTakeRate: dish.predictedTakeRate,
          servingPortions: dish.serving_portions,
          sellPrice: dish.sell_price
        }
      })
      return { category: section.category, items }
    })

    return {
      name: draft.name,
      eventType: draft.eventType,
      eventDate: draft.eventDate,
      servingType: draft.servingType,
      guestCount: draft.guestCount,
      sections
    }
  }

  applyMatchedMenu(matched: MatchedMenu, resolutions: Map<string, string | 'skip'>): void {
    if (!this.refs_) return
    const form = this.refs_.menuForm
    const sectionsArray = this.sectionsArray_

    // Patch top-level fields
    form.patchValue({
      name: matched.name,
      eventType: matched.eventType,
      eventDate: matched.eventDate ?? null,
      servingType: matched.servingType,
      guestCount: matched.guestCount
    })

    // Rebuild sections from scratch
    while (sectionsArray.length > 0) {
      sectionsArray.removeAt(0)
    }

    matched.sections.forEach((section, sectionIndex) => {
      const itemsArray = this.fb_.array<FormGroup>([])

      section.items.forEach((dish) => {
        const dishKey = `${sectionIndex}:${dish.nameHebrew}`
        const resolution = resolutions.get(dishKey)

        // Skip if explicitly skipped
        if (resolution === 'skip') return

        // Determine recipeId
        let recipeId: string | null = null
        if (resolution && resolution !== 'skip') {
          recipeId = resolution
        } else if (dish.status === 'matched') {
          recipeId = dish.recipeId
        }
        // unmatched/ambiguous without resolution → create placeholder row with empty recipeId

        const itemGroup = this.fb_.group({
          recipeId: [recipeId ?? '', Validators.required],
          recipeType: ['dish'],
          predictedTakeRate: [
            dish.predictedTakeRate ?? 0.4,
            [Validators.required, Validators.min(0), Validators.max(1)]
          ],
          sell_price: [dish.sellPrice ?? 0],
          food_cost_money: [0],
          food_cost_pct: [0],
          serving_portions: [dish.servingPortions ?? 1],
          serving_portions_pct: [0]
        })

        itemsArray.push(itemGroup)
      })

      const sectionGroup = this.fb_.group({
        _id: [crypto.randomUUID()],
        name: [section.category],
        sortOrder: [sectionIndex + 1],
        items: itemsArray
      })

      sectionsArray.push(sectionGroup)
    })
  }

  applyPatch(patch: AiMenuPatch): void {
    if (!this.refs_) return
    const form = this.refs_.menuForm

    const topLevelPatch: Record<string, unknown> = {}
    if (patch.name !== undefined) topLevelPatch['name'] = patch.name
    if (patch.eventType !== undefined) topLevelPatch['eventType'] = patch.eventType
    if (patch.eventDate !== undefined) topLevelPatch['eventDate'] = patch.eventDate
    if (patch.servingType !== undefined) topLevelPatch['servingType'] = patch.servingType
    if (patch.guestCount !== undefined) topLevelPatch['guestCount'] = patch.guestCount

    if (Object.keys(topLevelPatch).length > 0) {
      form.patchValue(topLevelPatch)
    }

    if (patch.sections !== undefined) {
      // Re-run matching on the patched sections, then apply
      const draftForMatching: AiMenuDraft = {
        name: (form.get('name')?.value as string) ?? '',
        eventType: (form.get('eventType')?.value as string) ?? '',
        eventDate: (form.get('eventDate')?.value as string | null) ?? null,
        servingType: (form.get('servingType')?.value as string) ?? '',
        guestCount: (form.get('guestCount')?.value as number) ?? 0,
        sections: patch.sections
      }
      const matched = this.runMatching(draftForMatching)
      this.applyMatchedMenu(matched, new Map())
    }
  }
}
