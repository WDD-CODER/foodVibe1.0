import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { KitchenStateService } from '../services/kitchen-state.service';
import { Recipe } from '../models/recipe.model';

export const recipeResolver: ResolveFn<Recipe | null> = (route) => {
  const kitchenState = inject(KitchenStateService);
  const router = inject(Router);

  const id = route.paramMap.get('id');
  if (!id) return null;

  const recipe = kitchenState.recipes_().find(r => r._id === id);
  if (!recipe) {
    router.navigate(['/recipe-builder']);
    return null;
  }

  return recipe;
};
