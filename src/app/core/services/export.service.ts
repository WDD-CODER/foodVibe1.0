import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';

import { Recipe, RecipeStep } from '@models/recipe.model';
import { MenuEvent, MenuSection, MenuItemSelection } from '@models/menu-event.model';
import { Product } from '@models/product.model';
import { KitchenStateService } from './kitchen-state.service';
import { ScalingService } from './scaling.service';
import { RecipeCostService } from './recipe-cost.service';

/** Sanitize string for use in file names (replace invalid chars). */
function sanitizeFileName(name: string): string {
  return name.replace(/[\s\\/:*?"<>|]/g, '_').replace(/_+/g, '_') || 'export';
}

function dateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly kitchenState_ = inject(KitchenStateService);
  private readonly scaling_ = inject(ScalingService);
  private readonly recipeCost_ = inject(RecipeCostService);

  /**
   * Export recipe/dish info to Excel: Info, Ingredients, Steps/Prep sheets.
   * Filename: name_x{quantity}_{date}.xlsx
   */
  exportRecipeInfo(recipe: Recipe, quantity: number): void {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor
      }))
    };

    const wb = XLSX.utils.book_new();

    const infoData: (string | number)[][] = [
      ['Name', recipe.name_hebrew ?? ''],
      ['Type', recipe.recipe_type_ === 'dish' ? 'dish' : 'preparation'],
      ['Yield', quantity],
      ['Yield unit', recipe.yield_unit_ ?? 'unit'],
      ['Station', recipe.default_station_ ?? '']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoData), 'Info');

    const ingHeaders = ['#', 'Ingredient', 'Amount', 'Unit', 'Cost'];
    const ingRows = scaledIngredients.map((row, i) => {
      const ing = scaledRecipe.ingredients_[i];
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
      return [i + 1, row.name, row.amount, row.unit, cost];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([ingHeaders, ...ingRows]), 'Ingredients');

    const isDish = recipe.recipe_type_ === 'dish' || (recipe.prep_items_?.length ?? 0) > 0 || (recipe.mise_categories_?.length ?? 0) > 0;
    const stepHeaders = ['Order', 'Instruction', 'Time (min)'];
    let stepRows: (string | number)[][];
    if (isDish) {
      const prep = this.scaling_.getScaledPrepItems(recipe, factor);
      stepRows = prep.map((p, i) => [i + 1, p.name + (p.amount ? ` — ${p.amount} ${p.unit}` : ''), 0]);
    } else {
      const steps = (recipe.steps_ ?? []) as RecipeStep[];
      stepRows = steps.map(s => [s.order_, s.instruction_ ?? '', s.labor_time_minutes_ ?? 0]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([stepHeaders, ...stepRows]), 'Steps');

    const fileName = `${sanitizeFileName(recipe.name_hebrew ?? 'recipe')}_x${quantity}_${dateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Export shopping list: ingredients grouped by category (products by categories_[0], sub-recipes under "הכנות").
   * Filename: name_x{quantity}_{date}.xlsx
   */
  exportShoppingList(recipe: Recipe, quantity: number): void {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const products = this.kitchenState_.products_();
    const recipes = this.kitchenState_.recipes_();

    const categoryToRows = new Map<string, { name: string; amount: number; unit: string }[]>();

    scaledIngredients.forEach(row => {
      const category = row.type === 'product'
        ? (products.find(p => p._id === row.referenceId) as Product | undefined)?.categories_?.[0] ?? 'כללי'
        : 'הכנות';
      const arr = categoryToRows.get(category) ?? [];
      arr.push({ name: row.name, amount: row.amount, unit: row.unit });
      categoryToRows.set(category, arr);
    });

    const headers = ['Category', 'Ingredient', 'Amount', 'Unit'];
    const rows: (string | number)[][] = [headers];
    const sortedCategories = Array.from(categoryToRows.keys()).sort();
    for (const cat of sortedCategories) {
      const items = categoryToRows.get(cat) ?? [];
      items.forEach(it => rows.push([cat, it.name, it.amount, it.unit]));
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Shopping list');
    const fileName = `${sanitizeFileName(recipe.name_hebrew ?? 'recipe')}_x${quantity}_${dateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Export menu as Excel: cover sheet + one sheet per section (dish name, portions, take rate, sell price).
   * Filename: menuName_x{guestCount}_{date}.xlsx
   */
  exportMenuInfo(menu: MenuEvent, _recipes: Recipe[]): void {
    const wb = XLSX.utils.book_new();

    const coverData: (string | number)[][] = [
      ['Menu name', menu.name_ ?? ''],
      ['Event type', menu.event_type_ ?? ''],
      ['Date', menu.event_date_ ?? ''],
      ['Guest count', menu.guest_count_ ?? 0],
      ['Pieces per person', menu.pieces_per_person_ ?? '']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(coverData), 'Menu info');

    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
    const recipeMap = new Map(_recipes.map(r => [r._id, r]));

    sections.forEach((section: MenuSection) => {
      const headers = ['Dish name', 'Portions', 'Take rate', 'Sell price'];
      const sectionRows: (string | number)[][] = [headers];
      (section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        const name = recipe?.name_hebrew ?? item.recipe_id_;
        sectionRows.push([
          name,
          item.derived_portions_ ?? 0,
          item.predicted_take_rate_ ?? 0,
          item.sell_price_ ?? ''
        ]);
      });
      const sheetName = (section.name_ ?? `Section_${section._id}`).slice(0, 31);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sectionRows), sheetName);
    });

    const fileName = `${sanitizeFileName(menu.name_ ?? 'menu')}_x${menu.guest_count_ ?? 0}_${dateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Export menu shopping list: all dishes' ingredients scaled by derived_portions_, grouped by category.
   * Filename: menuName_x{guestCount}_{date}.xlsx
   */
  exportMenuShoppingList(menu: MenuEvent, recipes: Recipe[], products: Product[]): void {
    const recipeMap = new Map(recipes.map(r => [r._id, r]));
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string }[]>();

    const addRow = (category: string, name: string, amount: number, unit: string): void => {
      const arr = categoryToAggregate.get(category) ?? [];
      const existing = arr.find(x => x.name === name && x.unit === unit);
      if (existing) existing.amount += amount;
      else arr.push({ name, amount, unit });
      categoryToAggregate.set(category, arr);
    };

    (menu.sections_ ?? []).forEach((section: MenuSection) => {
      (section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        if (!recipe?.ingredients_?.length) return;
        const portions = item.derived_portions_ ?? 0;
        const yieldAmount = recipe.yield_amount_ || 1;
        const factor = yieldAmount > 0 ? portions / yieldAmount : 0;
        const scaled = this.scaling_.getScaledIngredients(recipe, factor);
        scaled.forEach(row => {
          const category = row.type === 'product'
            ? (products.find(p => p._id === row.referenceId)?.categories_?.[0] ?? 'כללי')
            : 'הכנות';
          addRow(category, row.name, row.amount, row.unit);
        });
      });
    });

    const headers = ['Category', 'Ingredient', 'Amount', 'Unit'];
    const rows: (string | number)[][] = [headers];
    const sortedCategories = Array.from(categoryToAggregate.keys()).sort();
    for (const cat of sortedCategories) {
      (categoryToAggregate.get(cat) ?? []).forEach(it => rows.push([cat, it.name, it.amount, it.unit]));
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Shopping list');
    const fileName = `${sanitizeFileName(menu.name_ ?? 'menu')}_x${menu.guest_count_ ?? 0}_${dateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}
