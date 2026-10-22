import { Injectable, inject } from '@angular/core'
import type { Ingredient } from '@models/ingredient.model'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { KitchenStateService } from './kitchen-state.service'
import { PermissionService } from './permission.service'

export interface LinkUnlinkedRequest {
  /** The free-text ingredient name, as the partial-cost list shows it. */
  name: string
  product: Product
  /** The recipes (and dishes) whose own rows hold the item. */
  recipeIds: readonly string[]
  /** A recipe being edited in a form: its stored copy is not written over the unsaved edits. */
  skipRecipeId?: string | null
}

/** What a stored ingredient row is called: the snapshot when there is one, else the typed name. */
function rowName(row: Ingredient): string {
  const typed = (row as Ingredient & { nameHebrew?: string }).nameHebrew
  return (row.nameSnapshot ?? typed ?? '').trim()
}

/**
 * Plan 466 — turns a free-text ingredient (no product) into a linked one in the stored recipes and dishes that
 * hold it. One recipe write per affected recipe, through `KitchenStateService.saveRecipe`.
 */
@Injectable({ providedIn: 'root' })
export class UnlinkedIngredientLinkService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly permission_ = inject(PermissionService)

  /** Links every unlinked row named `name` in the listed stored recipes. Returns how many recipes were saved. */
  async link(request: LinkUnlinkedRequest): Promise<number> {
    const name = request.name.trim()
    const recipes = this.kitchenState_.recipesById_()
    let saved = 0
    for (const id of new Set(request.recipeIds)) {
      if (id === request.skipRecipeId) continue
      const recipe = recipes.get(id)
      if (!recipe) continue
      let changed = false
      const ingredients = (recipe.ingredients ?? []).map((row) => {
        if (row.referenceId || rowName(row) !== name) return row
        changed = true
        return {
          ...row,
          referenceId: request.product._id,
          type: 'product' as const,
          nameSnapshot: request.product.nameHebrew
        }
      })
      if (!changed) continue
      await this.kitchenState_.saveRecipe({ ...recipe, ingredients } as Recipe)
      saved++
    }
    return saved
  }

  /** True when the user may edit every listed stored recipe (the form's own recipe is not stored, so it is skipped). */
  canLink(recipeIds: readonly string[], skipRecipeId?: string | null): boolean {
    const recipes = this.kitchenState_.recipesById_()
    return recipeIds.every((id) => {
      if (id === skipRecipeId) return true
      const recipe = recipes.get(id)
      return !recipe || this.permission_.can('edit', { type: 'recipes', doc: recipe })
    })
  }
}
