import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { PermissionService } from '@services/permission.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { LoggingService } from '@services/logging.service'

/**
 * Backstop for `recipe-builder/:id` (plan 476): a staff member never lands in the builder for a recipe or dish he
 * did not create. He is sent to Cook View of that item. Owners and visitors pass at once, without waiting.
 * An id that is not found passes too: the route's resolver shows its not-found message.
 */
export const recipeBuilderAccessGuard: CanActivateFn = async (route) => {
  const permission = inject(PermissionService)
  const router = inject(Router)
  const logging = inject(LoggingService)
  const kitchenState = inject(KitchenStateService)
  const recipeData = inject(RecipeDataService)
  const dishData = inject(DishDataService)
  if (!permission.isStaff_()) return true

  const id = route.paramMap.get('id')
  if (!id) return true

  await Promise.all([recipeData.ensureLoaded(), dishData.ensureLoaded()])
  // Same matching as `recipeResolver`: the item's own id first, then the user's own copy of a master id.
  const items = kitchenState.recipes_()
  const item = items.find((r) => r._id === id) ?? items.find((r) => r._masterId === id)
  if (!item || !permission.isReadOnlyRecipe(item)) return true

  logging.info({
    event: 'recipeBuilder.staff_redirect',
    message: 'Staff sent to Cook View for a recipe they did not create',
    context: { id: item._id }
  })
  return router.createUrlTree(['/cook', item._id])
}
