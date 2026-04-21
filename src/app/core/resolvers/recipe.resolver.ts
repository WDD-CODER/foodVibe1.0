import { inject } from '@angular/core'
import { ResolveFn, Router } from '@angular/router'
import { RecipeDataService } from '../services/recipe-data.service'
import { DishDataService } from '../services/dish-data.service'
import { UserMsgService } from '../services/user-msg.service'
import { UserService } from '../services/user.service'
import { Recipe } from '../models/recipe.model'

export const recipeResolver: ResolveFn<Promise<Recipe | null>> = async (route) => {
  const recipeDataService = inject(RecipeDataService)
  const dishDataService = inject(DishDataService)
  const router = inject(Router)
  const userMsgService = inject(UserMsgService)
  const userService = inject(UserService)

  const id = route.paramMap.get('id')
  if (!id) return null

  // Check in-memory stores first — avoids unnecessary 404 network calls when
  // navigating within the app (stores already populated by service constructors).
  const inMemoryRecipe = recipeDataService.allRecipes_().find(r => r._id === id)
  if (inMemoryRecipe) return inMemoryRecipe

  const inMemoryDish = dishDataService.allDishes_().find(d => d._id === id)
  if (inMemoryDish) return inMemoryDish

  // In-memory miss (page refresh / direct URL) — use ID prefix to route to the
  // correct collection directly, avoiding a wasted 404 on the wrong collection.
  // Master dishes use "dish_" prefix (DISH_LIST); master recipes use "prep_" prefix
  // (RECIPE_LIST); user-created items have MongoDB ObjectId format — try both.
  const isDish = id.startsWith('dish_')
  const isRecipe = id.startsWith('prep_')

  const notFound = () => {
    userMsgService.onSetErrorMsg('המתכון לא נמצא')
    // Logged-in users land on recipe-builder (create new). Guests land on
    // recipe-book (public) — avoids triggering authGuard on recipe-builder
    // which would create a misleading "not logged in" warning cascade.
    router.navigate([userService.isLoggedIn() ? '/recipe-builder' : '/recipe-book'])
    return null
  }

  if (isDish) {
    try { return await dishDataService.getDishById(id) } catch { return notFound() }
  }

  if (isRecipe) {
    try { return await recipeDataService.getRecipeById(id) } catch { return notFound() }
  }

  // Unknown prefix (user-created ObjectId) — try recipe first, then dish.
  try {
    return await recipeDataService.getRecipeById(id)
  } catch {
    try {
      return await dishDataService.getDishById(id)
    } catch {
      return notFound()
    }
  }
}
