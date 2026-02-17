import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { RecipeDataService } from '../services/recipe-data.service';
import { Recipe } from '../models/recipe.model';

export const recipeResolver: ResolveFn<Promise<Recipe | null>> = async (route) => {
  const recipeDataService = inject(RecipeDataService);
  const router = inject(Router);

  const id = route.paramMap.get('id');
  if (!id) return null;

  try {
    const recipe = await recipeDataService.getRecipeById(id);
    return recipe;
  } catch {
    router.navigate(['/recipe-builder']);
    return null;
  }
};
