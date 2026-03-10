import { Injectable, inject } from '@angular/core';
import { Workbook } from 'exceljs';

import { Recipe, RecipeStep } from '@models/recipe.model';
import { MenuEvent, MenuSection, MenuItemSelection } from '@models/menu-event.model';
import { Product } from '@models/product.model';
import { KitchenStateService } from './kitchen-state.service';
import { ScalingService } from './scaling.service';
import { RecipeCostService } from './recipe-cost.service';
import type { ScaledPrepRow } from './scaling.service';

/** Sanitize string for use in file names (replace invalid chars). */
function sanitizeFileName(name: string): string {
  return name.replace(/[\s\\/:*?"<>|]/g, '_').replace(/_+/g, '_') || 'export';
}

function dateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly kitchenState_ = inject(KitchenStateService);
  private readonly scaling_ = inject(ScalingService);
  private readonly recipeCost_ = inject(RecipeCostService);

  /** Download workbook as .xlsx file. */
  private async downloadWorkbook(wb: Workbook, fileName: string): Promise<void> {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: XLSX_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Apply header row style (bold, wrapText). */
  private styleHeaderRow(ws: import('exceljs').Worksheet, rowNumber: number): void {
    const row = ws.getRow(rowNumber);
    row.font = { bold: true };
    row.alignment = { wrapText: true, vertical: 'top' };
  }

  /** Apply wrapText to a data row. */
  private styleDataRow(ws: import('exceljs').Worksheet, rowNumber: number): void {
    const row = ws.getRow(rowNumber);
    row.alignment = { wrapText: true, vertical: 'top' };
  }

  /**
   * Export recipe/dish info to Excel: Info, Ingredients, Steps/Prep sheets.
   * Filename: name_x{quantity}_{date}.xlsx
   */
  async exportRecipeInfo(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor
      }))
    };

    const wb = new Workbook();

    const infoWs = wb.addWorksheet('Info');
    const infoData: (string | number)[][] = [
      ['Name', recipe.name_hebrew ?? ''],
      ['Type', recipe.recipe_type_ === 'dish' ? 'dish' : 'preparation'],
      ['Yield', quantity],
      ['Yield unit', recipe.yield_unit_ ?? 'unit'],
      ['Station', recipe.default_station_ ?? '']
    ];
    infoData.forEach((row, i) => infoWs.addRow(row));
    infoWs.getColumn(1).width = 14;
    infoWs.getColumn(2).width = 30;

    const ingWs = wb.addWorksheet('Ingredients');
    ingWs.addRow(['#', 'Ingredient', 'Amount', 'Unit', 'Cost']);
    this.styleHeaderRow(ingWs, 1);
    scaledIngredients.forEach((row, i) => {
      const ing = scaledRecipe.ingredients_[i];
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
      ingWs.addRow([i + 1, row.name, row.amount, row.unit, cost]);
    });
    for (let r = 2; r <= scaledIngredients.length + 1; r++) this.styleDataRow(ingWs, r);
    ingWs.getColumn(1).width = 6;
    ingWs.getColumn(2).width = 28;
    ingWs.getColumn(3).width = 12;
    ingWs.getColumn(4).width = 10;
    ingWs.getColumn(5).width = 10;

    const isDish = recipe.recipe_type_ === 'dish' || (recipe.prep_items_?.length ?? 0) > 0 || (recipe.mise_categories_?.length ?? 0) > 0;
    const stepWs = wb.addWorksheet('Steps');
    stepWs.addRow(['Order', 'Instruction', 'Time (min)']);
    this.styleHeaderRow(stepWs, 1);
    let stepRows: (string | number)[][];
    if (isDish) {
      const prep = this.scaling_.getScaledPrepItems(recipe, factor);
      stepRows = prep.map((p, i) => [i + 1, p.name + (p.amount ? ` — ${p.amount} ${p.unit}` : ''), 0]);
    } else {
      const steps = (recipe.steps_ ?? []) as RecipeStep[];
      stepRows = steps.map(s => [s.order_, s.instruction_ ?? '', s.labor_time_minutes_ ?? 0]);
    }
    stepRows.forEach(row => stepWs.addRow(row));
    for (let r = 2; r <= stepRows.length + 1; r++) this.styleDataRow(stepWs, r);
    stepWs.getColumn(1).width = 8;
    stepWs.getColumn(2).width = 50;
    stepWs.getColumn(3).width = 12;

    const fileName = `${sanitizeFileName(recipe.name_hebrew ?? 'recipe')}_x${quantity}_${dateStr()}.xlsx`;
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export shopping list: ingredients grouped by category.
   * Filename: name_x{quantity}_{date}.xlsx
   */
  async exportShoppingList(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const products = this.kitchenState_.products_();

    const categoryToRows = new Map<string, { name: string; amount: number; unit: string }[]>();
    scaledIngredients.forEach(row => {
      const category = row.type === 'product'
        ? (products.find(p => p._id === row.referenceId) as Product | undefined)?.categories_?.[0] ?? 'כללי'
        : 'הכנות';
      const arr = categoryToRows.get(category) ?? [];
      arr.push({ name: row.name, amount: row.amount, unit: row.unit });
      categoryToRows.set(category, arr);
    });

    const wb = new Workbook();
    const ws = wb.addWorksheet('Shopping list');
    ws.addRow(['Category', 'Ingredient', 'Amount', 'Unit']);
    this.styleHeaderRow(ws, 1);
    let rowNum = 2;
    const sortedCategories = Array.from(categoryToRows.keys()).sort();
    for (const cat of sortedCategories) {
      const items = categoryToRows.get(cat) ?? [];
      items.forEach(it => {
        ws.addRow([cat, it.name, it.amount, it.unit]);
        this.styleDataRow(ws, rowNum++);
      });
    }
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 10;

    const fileName = `${sanitizeFileName(recipe.name_hebrew ?? 'recipe')}_x${quantity}_${dateStr()}.xlsx`;
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export menu as Excel: cover sheet + one sheet per section.
   * Filename: menuName_x{guestCount}_{date}.xlsx
   */
  async exportMenuInfo(menu: MenuEvent, _recipes: Recipe[]): Promise<void> {
    const wb = new Workbook();

    const coverWs = wb.addWorksheet('Menu info');
    const coverData: (string | number)[][] = [
      ['Menu name', menu.name_ ?? ''],
      ['Event type', menu.event_type_ ?? ''],
      ['Date', menu.event_date_ ?? ''],
      ['Guest count', menu.guest_count_ ?? 0],
      ['Pieces per person', menu.pieces_per_person_ ?? '']
    ];
    coverData.forEach(row => coverWs.addRow(row));
    coverWs.getColumn(1).width = 18;
    coverWs.getColumn(2).width = 24;

    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
    const recipeMap = new Map(_recipes.map(r => [r._id, r]));

    sections.forEach((section: MenuSection) => {
      const sheetName = (section.name_ ?? `Section_${section._id}`).slice(0, 31);
      const ws = wb.addWorksheet(sheetName);
      ws.addRow(['Dish name', 'Portions', 'Take rate', 'Sell price']);
      this.styleHeaderRow(ws, 1);
      let rowNum = 2;
      (section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        const name = recipe?.name_hebrew ?? item.recipe_id_;
        ws.addRow([
          name,
          item.derived_portions_ ?? 0,
          item.predicted_take_rate_ ?? 0,
          item.sell_price_ ?? ''
        ]);
        this.styleDataRow(ws, rowNum++);
      });
      ws.getColumn(1).width = 32;
      ws.getColumn(2).width = 12;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 12;
    });

    const fileName = `${sanitizeFileName(menu.name_ ?? 'menu')}_x${menu.guest_count_ ?? 0}_${dateStr()}.xlsx`;
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export menu shopping list: all dishes' ingredients scaled by derived_portions_, grouped by category.
   * Filename: menuName_x{guestCount}_{date}.xlsx
   */
  async exportMenuShoppingList(menu: MenuEvent, recipes: Recipe[], products: Product[]): Promise<void> {
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

    const wb = new Workbook();
    const ws = wb.addWorksheet('Shopping list');
    ws.addRow(['Category', 'Ingredient', 'Amount', 'Unit']);
    this.styleHeaderRow(ws, 1);
    let rowNum = 2;
    const sortedCategories = Array.from(categoryToAggregate.keys()).sort();
    for (const cat of sortedCategories) {
      (categoryToAggregate.get(cat) ?? []).forEach(it => {
        ws.addRow([cat, it.name, it.amount, it.unit]);
        this.styleDataRow(ws, rowNum++);
      });
    }
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 10;

    const fileName = `${sanitizeFileName(menu.name_ ?? 'menu')}_x${menu.guest_count_ ?? 0}_${dateStr()}.xlsx`;
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export menu checklist (mise en place / prep items). Mode: by_dish (per-dish breakdown) or by_category (aggregated).
   * Filename: menuName_checklist_{date}.xlsx
   */
  async exportChecklist(menu: MenuEvent, recipes: Recipe[], mode: 'by_dish' | 'by_category'): Promise<void> {
    const recipeMap = new Map(recipes.map(r => [r._id, r]));
    const wb = new Workbook();

    if (mode === 'by_dish') {
      const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] });
      let rowNum = 1;
      const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
      for (const section of sections) {
        for (const item of section.items_ ?? []) {
          const recipe = recipeMap.get(item.recipe_id_);
          if (!recipe) continue;
          const portions = item.derived_portions_ ?? 0;
          const yieldAmount = recipe.yield_amount_ || 1;
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0;
          const prepRows: ScaledPrepRow[] = this.scaling_.getScaledPrepItems(recipe, factor);
          if (prepRows.length === 0) continue;

          ws.addRow([`Dish: ${recipe.name_hebrew ?? item.recipe_id_}`, `Portions: ${portions}`, `Yield: ${yieldAmount}`, `Scale: x${factor}`]);
          const headerRow = ws.getRow(rowNum);
          headerRow.font = { bold: true };
          headerRow.alignment = { wrapText: true, vertical: 'top' };
          rowNum++;
          ws.addRow(['Prep Item', 'Category', 'Quantity', 'Unit']);
          const subHeader = ws.getRow(rowNum);
          subHeader.font = { bold: true };
          subHeader.alignment = { wrapText: true, vertical: 'top' };
          rowNum++;
          prepRows.forEach(pr => {
            ws.addRow([pr.name, pr.category_name ?? '', pr.amount, pr.unit]);
            this.styleDataRow(ws, rowNum++);
          });
          ws.addRow([]);
          rowNum++;
        }
      }
      ws.getColumn(1).width = 28;
      ws.getColumn(2).width = 14;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 10;
    } else {
      const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string }[]>();
      const addPrep = (category: string, name: string, amount: number, unit: string): void => {
        const arr = categoryToAggregate.get(category) ?? [];
        const existing = arr.find(x => x.name === name && x.unit === unit);
        if (existing) existing.amount += amount;
        else arr.push({ name, amount, unit });
        categoryToAggregate.set(category, arr);
      };
      (menu.sections_ ?? []).forEach((section: MenuSection) => {
        (section.items_ ?? []).forEach((item: MenuItemSelection) => {
          const recipe = recipeMap.get(item.recipe_id_);
          if (!recipe) return;
          const portions = item.derived_portions_ ?? 0;
          const yieldAmount = recipe.yield_amount_ || 1;
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0;
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
          prepRows.forEach(pr => addPrep(pr.category_name ?? 'כללי', pr.name, pr.amount, pr.unit));
        });
      });

      const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] });
      ws.addRow(['Category', 'Prep Item', 'Quantity', 'Unit']);
      this.styleHeaderRow(ws, 1);
      let rowNum = 2;
      const sortedCategories = Array.from(categoryToAggregate.keys()).sort();
      for (const cat of sortedCategories) {
        ws.addRow([cat, '', '', '']);
        const catRow = ws.getRow(rowNum);
        catRow.font = { bold: true };
        catRow.alignment = { wrapText: true, vertical: 'top' };
        rowNum++;
        const items = categoryToAggregate.get(cat) ?? [];
        items.forEach(it => {
          ws.addRow(['', it.name, it.amount, it.unit]);
          this.styleDataRow(ws, rowNum++);
        });
      }
      ws.getColumn(1).width = 20;
      ws.getColumn(2).width = 28;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 10;
    }

    const fileName = `${sanitizeFileName(menu.name_ ?? 'menu')}_checklist_${dateStr()}.xlsx`;
    await this.downloadWorkbook(wb, fileName);
  }
}
