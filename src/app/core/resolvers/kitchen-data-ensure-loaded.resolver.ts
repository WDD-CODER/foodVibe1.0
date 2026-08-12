import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { ProductDataService } from '../services/product-data.service'
import { RecipeDataService } from '../services/recipe-data.service'
import { DishDataService } from '../services/dish-data.service'

/**
 * Ensures products, recipes, and dishes are all hydrated before routes that resolve
 * ingredient/prep names against the live catalog render (recipe-builder, recipe-book,
 * cook view). Without this gate, a component reading KitchenStateService.products_()/
 * recipes_() before the underlying services finish their initial load can permanently
 * unlink ingredient rows that would otherwise resolve fine a moment later — see
 * RecipeFormService.patchFormFromRecipe(), plan 300 finding 3.
 */
export const kitchenDataEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const productData = inject(ProductDataService)
  const recipeData = inject(RecipeDataService)
  const dishData = inject(DishDataService)
  return Promise.all([productData.ensureLoaded(), recipeData.ensureLoaded(), dishData.ensureLoaded()]).then(() => true)
}
