/**
 * ExportService — thin facade delegating to RecipeExportService and MenuExportService.
 * All consumer imports (cook-view, recipe-builder, menu-intelligence) remain unchanged.
 * Plan: refactor/split-export-service
 */

import { Injectable, inject } from '@angular/core'

import { Recipe } from '@models/recipe.model'
import { MenuEvent } from '@models/menu-event.model'
import { Product } from '@models/product.model'
import { type ExportPayload } from '../utils/export.util'
import { RecipeExportService } from './recipe-export.service'
import { MenuExportService } from './menu-export.service'

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly recipeExport_ = inject(RecipeExportService)
  private readonly menuExport_ = inject(MenuExportService)

  // ── Recipe delegates ─────────────────────────────────────────────────────────

  exportRecipeInfo(recipe: Recipe, quantity: number): Promise<void> {
    return this.recipeExport_.exportRecipeInfo(recipe, quantity)
  }

  exportCookingSteps(recipe: Recipe, quantity: number): Promise<void> {
    return this.recipeExport_.exportCookingSteps(recipe, quantity)
  }

  exportDishChecklist(recipe: Recipe, quantity: number): Promise<void> {
    return this.recipeExport_.exportDishChecklist(recipe, quantity)
  }

  exportShoppingList(recipe: Recipe, quantity: number): Promise<void> {
    return this.recipeExport_.exportShoppingList(recipe, quantity)
  }

  exportAllTogetherRecipe(recipe: Recipe, quantity: number): Promise<void> {
    return this.recipeExport_.exportAllTogetherRecipe(recipe, quantity)
  }

  getRecipeInfoPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    return this.recipeExport_.getRecipeInfoPreviewPayload(recipe, quantity)
  }

  getCookingStepsPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    return this.recipeExport_.getCookingStepsPreviewPayload(recipe, quantity)
  }

  getDishChecklistPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    return this.recipeExport_.getDishChecklistPreviewPayload(recipe, quantity)
  }

  getShoppingListPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    return this.recipeExport_.getShoppingListPreviewPayload(recipe, quantity)
  }

  // ── Menu delegates ───────────────────────────────────────────────────────────

  exportMenuInfo(menu: MenuEvent, recipes: Recipe[]): Promise<void> {
    return this.menuExport_.exportMenuInfo(menu, recipes)
  }

  exportMenuShoppingList(menu: MenuEvent, recipes: Recipe[], products: Product[]): Promise<void> {
    return this.menuExport_.exportMenuShoppingList(menu, recipes, products)
  }

  exportChecklist(
    menu: MenuEvent,
    recipes: Recipe[],
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): Promise<void> {
    return this.menuExport_.exportChecklist(menu, recipes, mode)
  }

  exportAllTogetherMenu(
    menu: MenuEvent,
    recipes: Recipe[],
    products: Product[],
    checklistMode: 'by_dish' | 'by_category' | 'by_station' = 'by_category'
  ): Promise<void> {
    return this.menuExport_.exportAllTogetherMenu(menu, recipes, products, checklistMode)
  }

  getMenuInfoPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    return this.menuExport_.getMenuInfoPreviewPayload(menu, recipes)
  }

  getMenuShoppingListPreviewPayload(menu: MenuEvent, recipes: Recipe[], products: Product[]): ExportPayload {
    return this.menuExport_.getMenuShoppingListPreviewPayload(menu, recipes, products)
  }

  getMenuChecklistPreviewPayload(
    menu: MenuEvent,
    recipes: Recipe[],
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): ExportPayload {
    return this.menuExport_.getMenuChecklistPreviewPayload(menu, recipes, mode)
  }

  getMenuAllViewPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    return this.menuExport_.getMenuAllViewPreviewPayload(menu, recipes)
  }
}
