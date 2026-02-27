import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { RecipeDataService } from '../services/recipe-data.service';
import { DishDataService } from '../services/dish-data.service';
import { UserMsgService } from '../services/user-msg.service';
import { Recipe } from '../models/recipe.model';

export const recipeResolver: ResolveFn<Promise<Recipe | null>> = async (route) => {
  const recipeDataService = inject(RecipeDataService);
  const dishDataService = inject(DishDataService);
  const router = inject(Router);
  const userMsgService = inject(UserMsgService);

  const id = route.paramMap.get('id');
  if (!id) return null;

  try {
    const recipe = await recipeDataService.getRecipeById(id);
    return recipe;
  } catch {
    try {
      const dish = await dishDataService.getDishById(id);
      return dish;
    } catch {
      userMsgService.onSetErrorMsg('המתכון לא נמצא');
      router.navigate(['/recipe-builder']);
      return null;
    }
  }
};
