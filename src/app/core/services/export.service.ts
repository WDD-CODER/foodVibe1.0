import { Injectable, inject } from '@angular/core';
import { Workbook } from 'exceljs';

import { Recipe, RecipeStep } from '@models/recipe.model';
import { MenuEvent, MenuSection, MenuItemSelection } from '@models/menu-event.model';
import { Product } from '@models/product.model';
import { KitchenStateService } from './kitchen-state.service';
import { ScalingService } from './scaling.service';
import { RecipeCostService } from './recipe-cost.service';
import type { ScaledPrepRow } from './scaling.service';
import {
  sanitizeFileName,
  exportDateStr,
  buildExportFileName,
  roundExportNumber,
  heHeader,
  heUnit,
  type ExportPayload,
  type ExportSection,
  type RecipeSheetBlock,
  type RecipeSheetLabels
} from '../utils/export.util';

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

  private static readonly EXCEL_TEAL = 'FF009688';
  private static readonly EXCEL_HEADER_GRAY = 'FFE0E0E0';
  private static readonly EXCEL_SUBTITLE_GRAY = 'FFF5F5F5';
  private static readonly EXCEL_BORDER_THIN = { style: 'thin' as const };

  /** Merge cells in row across colSpan; style as title (teal fill, white bold). */
  private styleExcelTitle(ws: import('exceljs').Worksheet, rowNum: number, colSpan: number): void {
    if (colSpan > 1) ws.mergeCells(rowNum, 1, rowNum, colSpan);
    const row = ws.getRow(rowNum);
    row.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ExportService.EXCEL_TEAL } };
    row.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    row.height = 22;
  }

  /** Merge cells in row across colSpan; style as subtitle (light gray, italic). */
  private styleExcelSubtitle(ws: import('exceljs').Worksheet, rowNum: number, colSpan: number): void {
    if (colSpan > 1) ws.mergeCells(rowNum, 1, rowNum, colSpan);
    const row = ws.getRow(rowNum);
    row.font = { size: 11, italic: true };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ExportService.EXCEL_SUBTITLE_GRAY } };
    row.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    row.height = 18;
  }

  /** Style row as column header: gray fill, bold, thin borders. */
  private styleExcelColumnHeader(ws: import('exceljs').Worksheet, rowNum: number, numCols: number): void {
    const row = ws.getRow(rowNum);
    row.font = { bold: true, size: 10 };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ExportService.EXCEL_HEADER_GRAY } };
    row.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    for (let c = 1; c <= numCols; c++) {
      row.getCell(c).border = {
        top: ExportService.EXCEL_BORDER_THIN,
        left: ExportService.EXCEL_BORDER_THIN,
        bottom: ExportService.EXCEL_BORDER_THIN,
        right: ExportService.EXCEL_BORDER_THIN
      };
    }
  }

  /** Add thin borders to all cells in a data row. */
  private styleExcelDataRowBorders(ws: import('exceljs').Worksheet, rowNum: number, numCols: number): void {
    const row = ws.getRow(rowNum);
    for (let c = 1; c <= numCols; c++) {
      row.getCell(c).border = {
        top: ExportService.EXCEL_BORDER_THIN,
        left: ExportService.EXCEL_BORDER_THIN,
        bottom: ExportService.EXCEL_BORDER_THIN,
        right: ExportService.EXCEL_BORDER_THIN
      };
    }
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };
  }

  /** Empty separator row with small height. */
  private styleExcelSeparator(ws: import('exceljs').Worksheet, rowNum: number): void {
    const row = ws.getRow(rowNum);
    row.height = 8;
  }

  /** Build recipe-sheet block (header, yield, instructions, prep time) for Excel and preview. Plan 108. */
  private buildRecipeSheetBlock(recipe: Recipe, quantity: number): RecipeSheetBlock {
    const steps = (recipe.steps_ ?? []) as RecipeStep[];
    const isDish = recipe.recipe_type_ === 'dish' || (recipe.prep_items_?.length ?? 0) > 0 || (recipe.mise_categories_?.length ?? 0) > 0;
    const preparationInstructions = isDish
      ? (steps.length ? steps.map(s => (s.instruction_ ?? '').trim()).filter(Boolean) : [])
      : steps.map(s => (s.instruction_ ?? '').trim()).filter(Boolean);
    const preparationTime = steps.reduce((sum, s) => sum + (s.labor_time_minutes_ ?? 0), 0);
    return {
      date: exportDateStr(),
      recipeName: recipe.name_hebrew ?? '',
      yieldQty: quantity,
      yieldUnit: heUnit(recipe.yield_unit_ ?? 'unit'),
      preparationInstructions,
      preparationTime
    };
  }

  /** Fill a worksheet with single-sheet recipe layout. Plan 108. */
  private fillRecipeSheetWorksheet(ws: import('exceljs').Worksheet, recipe: Recipe, quantity: number): void {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({ ...ing, amount_: (ing.amount_ ?? 0) * factor }))
    };
    const sheetBlock = this.buildRecipeSheetBlock(recipe, quantity);
    const numCols = 4;
    let rowNum = 1;

    ws.addRow([heHeader('date'), sheetBlock.date]);
    this.styleExcelDataRowBorders(ws, rowNum++, 2);
    ws.addRow([heHeader('recipe_name'), sheetBlock.recipeName]);
    this.styleExcelDataRowBorders(ws, rowNum++, 2);
    ws.addRow([]);
    this.styleExcelSeparator(ws, rowNum++);

    ws.addRow([heHeader('amount'), sheetBlock.yieldQty]);
    this.styleExcelDataRowBorders(ws, rowNum++, 2);
    ws.addRow([heHeader('unit'), sheetBlock.yieldUnit]);
    this.styleExcelDataRowBorders(ws, rowNum++, 2);
    ws.addRow([]);
    this.styleExcelSeparator(ws, rowNum++);

    ws.addRow([heHeader('ingredients_header')]);
    this.styleExcelTitle(ws, rowNum++, numCols);
    ws.addRow([heHeader('ingredients_header'), heHeader('amount'), heHeader('unit'), heHeader('unit_price')]);
    this.styleExcelColumnHeader(ws, rowNum++, numCols);
    scaledIngredients.forEach((row, i) => {
      const ing = scaledRecipe.ingredients_[i];
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
      const unitPrice = row.amount > 0 ? cost / row.amount : 0;
      ws.addRow([row.name, roundExportNumber(row.amount), heUnit(row.unit), roundExportNumber(unitPrice)]);
      this.styleExcelDataRowBorders(ws, rowNum++, numCols);
    });
    ws.addRow([]);
    this.styleExcelSeparator(ws, rowNum++);

    ws.addRow([heHeader('preparation_instructions')]);
    this.styleExcelSubtitle(ws, rowNum++, numCols);
    if (sheetBlock.preparationInstructions.length) {
      sheetBlock.preparationInstructions.forEach(line => {
        ws.addRow([line]);
        this.styleDataRow(ws, rowNum++);
      });
    } else {
      ws.addRow(['']);
      rowNum++;
    }
    ws.addRow([]);
    this.styleExcelSeparator(ws, rowNum++);

    ws.addRow([heHeader('preparation_time'), roundExportNumber(sheetBlock.preparationTime)]);
    this.styleExcelDataRowBorders(ws, rowNum, 2);

    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 14;
  }

  /**
   * Export recipe/dish info to Excel: single sheet (header, yield, ingredients, instructions, prep time). Plan 108.
   */
  async exportRecipeInfo(recipe: Recipe, quantity: number): Promise<void> {
    const wb = new Workbook();
    const ws = wb.addWorksheet(heHeader('info'), { views: [{ rightToLeft: true }] });
    this.fillRecipeSheetWorksheet(ws, recipe, quantity);
    const fileName = buildExportFileName('recipe-info', recipe.name_hebrew ?? 'recipe');
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export cooking steps (recipe/preparation only): order, instruction, time; item info + export date.
   * Filename: cooking-steps_{recipeName}_{date}.xlsx
   */
  async exportCookingSteps(recipe: Recipe, quantity: number): Promise<void> {
    const steps = (recipe.steps_ ?? []) as RecipeStep[];
    const wb = new Workbook();
    const ws = wb.addWorksheet('Cooking steps', { views: [{ rightToLeft: true }] });
    ws.addRow([heHeader('exported_at'), exportDateStr(), '', recipe.name_hebrew ?? '', `${heHeader('yield')}: ${quantity} ${heUnit(recipe.yield_unit_ ?? 'unit')}`]);
    this.styleHeaderRow(ws, 1);
    ws.addRow([heHeader('order'), heHeader('instruction'), heHeader('time_min')]);
    this.styleHeaderRow(ws, 2);
    let rowNum = 3;
    steps.forEach(s => {
      ws.addRow([s.order_, s.instruction_ ?? '', roundExportNumber(s.labor_time_minutes_ ?? 0)]);
      this.styleDataRow(ws, rowNum++);
    });
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 50;
    ws.getColumn(3).width = 12;
    const fileName = buildExportFileName('cooking-steps', recipe.name_hebrew ?? 'recipe');
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export checklist for a single dish (prep/mise items).
   * Filename: check-list_{dishName}_{date}.xlsx
   */
  async exportDishChecklist(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
    const sortedPrep = [...prepRows].sort((a, b) => {
      const catA = a.category_name ?? '';
      const catB = b.category_name ?? '';
      return catA.localeCompare(catB) || a.name.localeCompare(b.name);
    });
    const wb = new Workbook();
    const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] });
    ws.addRow([recipe.name_hebrew ?? heHeader('dish'), `${heHeader('portions')}: ${quantity}`, `${heHeader('yield')}: ${recipe.yield_amount_ ?? 1} ${heUnit(recipe.yield_unit_ ?? 'unit')}`, `${heHeader('scale')}: x${roundExportNumber(factor)}`]);
    this.styleHeaderRow(ws, 1);
    ws.addRow([heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')]);
    this.styleHeaderRow(ws, 2);
    let rowNum = 3;
    sortedPrep.forEach(pr => {
      ws.addRow([pr.name, pr.category_name ?? '', roundExportNumber(pr.amount), heUnit(pr.unit)]);
      this.styleDataRow(ws, rowNum++);
    });
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 10;
    const fileName = buildExportFileName('check-list', recipe.name_hebrew ?? 'dish');
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Build payload for recipe info preview (same data as export). Plan 108: recipeSheet + ingredients with unit price.
   */
  getRecipeInfoPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor
      }))
    };
    const recipeSheet = this.buildRecipeSheetBlock(recipe, quantity);
    const ingredientRows: (string | number)[][] = scaledIngredients.map((row, i) => {
      const ing = scaledRecipe.ingredients_[i];
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
      const unitPrice = row.amount > 0 ? cost / row.amount : 0;
      return [row.name, roundExportNumber(row.amount), heUnit(row.unit), roundExportNumber(unitPrice)];
    });

    return {
      title: `${recipe.name_hebrew ?? 'Recipe'} — ${heHeader('info')}`,
      subtitle: `× ${quantity} ${heUnit(recipe.yield_unit_ ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      recipeSheet,
      recipeSheetLabels: {
        date: heHeader('date'),
        recipeName: heHeader('recipe_name'),
        amount: heHeader('amount'),
        unit: heHeader('unit'),
        preparationInstructions: heHeader('preparation_instructions'),
        preparationTime: heHeader('preparation_time'),
        ingredients: heHeader('ingredients_header')
      },
      sections: [
        {
          title: heHeader('ingredients_header'),
          headerRow: [heHeader('ingredients_header'), heHeader('amount'), heHeader('unit'), heHeader('unit_price')],
          rows: ingredientRows
        }
      ]
    };
  }

  /**
   * Build payload for shopping list preview (same data as export).
   */
  getShoppingListPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
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

    const sortedCategories = Array.from(categoryToRows.keys()).sort();
    const rows: (string | number)[][] = [];
    for (const cat of sortedCategories) {
      const items = categoryToRows.get(cat) ?? [];
      items.forEach(it =>
        rows.push([cat, it.name, roundExportNumber(it.amount), heUnit(it.unit)])
      );
    }

    const sections: ExportSection[] = [
      {
        headerRow: [heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit')],
        rows
      }
    ];

    return {
      title: `${recipe.name_hebrew ?? 'Recipe'} — ${heHeader('shopping_list')}`,
      subtitle: `× ${quantity} ${heUnit(recipe.yield_unit_ ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      sections
    };
  }

  /**
   * Build payload for cooking steps preview (recipe only).
   */
  getCookingStepsPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const steps = (recipe.steps_ ?? []) as RecipeStep[];
    const rows: (string | number)[][] = steps.map(s => [
      s.order_,
      s.instruction_ ?? '',
      roundExportNumber(s.labor_time_minutes_ ?? 0)
    ]);
    return {
      title: `${recipe.name_hebrew ?? 'Recipe'} — Cooking steps`,
      subtitle: `Yield: ${quantity} ${recipe.yield_unit_ ?? 'unit'}`,
      exportedAt: new Date().toISOString(),
      sections: [
        { headerRow: ['Order', 'Instruction', 'Time (min)'], rows }
      ]
    };
  }

  /**
   * Build payload for single-dish checklist preview.
   */
  getDishChecklistPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
    const sortedPrep = [...prepRows].sort((a, b) => {
      const catA = a.category_name ?? '';
      const catB = b.category_name ?? '';
      return catA.localeCompare(catB) || a.name.localeCompare(b.name);
    });
    const rows: (string | number)[][] = sortedPrep.map(pr => [
      pr.name,
      pr.category_name ?? '',
      roundExportNumber(pr.amount),
      heUnit(pr.unit)
    ]);
    return {
      title: `${recipe.name_hebrew ?? heHeader('dish')} — ${heHeader('checklist')}`,
      subtitle: `${heHeader('portions')}: ${quantity}`,
      exportedAt: new Date().toISOString(),
      sections: [
        { headerRow: [heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')], rows }
      ]
    };
  }

  /**
   * Build payload for menu info preview (cover + sections).
   */
  getMenuInfoPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    const recipeMap = new Map(recipes.map(r => [r._id, r]));
    const coverRows: (string | number)[][] = [
      [heHeader('menu_name'), menu.name_ ?? ''],
      [heHeader('event_type'), menu.event_type_ ?? ''],
      [heHeader('date'), menu.event_date_ ?? ''],
      [heHeader('guest_count'), menu.guest_count_ ?? 0],
      [heHeader('pieces_per_person'), menu.pieces_per_person_ ?? '']
    ];
    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
    const exportSections: ExportSection[] = [
      { title: heHeader('menu_info'), headerRow: [heHeader('field'), heHeader('value')], rows: coverRows }
    ];
    sections.forEach((section: MenuSection) => {
      const sectionRows: (string | number)[][] = (section.items_ ?? []).map((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        const name = recipe?.name_hebrew ?? item.recipe_id_;
        return [
          name,
          roundExportNumber(item.derived_portions_ ?? 0),
          roundExportNumber(item.predicted_take_rate_ ?? 0),
          item.sell_price_ !== undefined && item.sell_price_ !== null
            ? roundExportNumber(Number(item.sell_price_))
            : ''
        ];
      });
      exportSections.push({
        title: section.name_ ?? `Section`,
        headerRow: [heHeader('dish_name'), heHeader('portions'), heHeader('take_rate'), heHeader('sell_price')],
        rows: sectionRows
      });
    });
    return {
      title: menu.name_ ?? 'Menu',
      subtitle: [menu.event_type_, menu.event_date_].filter(Boolean).join(' · ') || undefined,
      exportedAt: new Date().toISOString(),
      sections: exportSections
    };
  }

  /**
   * Build payload for menu shopping list preview (same aggregation as export).
   */
  getMenuShoppingListPreviewPayload(menu: MenuEvent, recipes: Recipe[], products: Product[]): ExportPayload {
    const recipeMap = new Map(recipes.map(r => [r._id, r]));
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; cost: number }[]>();

    const addRow = (category: string, name: string, amount: number, unit: string, lineCost: number): void => {
      const arr = categoryToAggregate.get(category) ?? [];
      const existing = arr.find(x => x.name === name && x.unit === unit);
      if (existing) {
        existing.amount += amount;
        existing.cost += lineCost;
      } else {
        arr.push({ name, amount, unit, cost: lineCost });
      }
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
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
            ...ing,
            amount_: (ing.amount_ ?? 0) * factor
          }))
        };
        scaled.forEach((row, i) => {
          const category = row.type === 'product'
            ? (products.find(p => p._id === row.referenceId)?.categories_?.[0] ?? 'כללי')
            : 'הכנות';
          const ing = scaledRecipe.ingredients_[i];
          const lineCost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
          addRow(category, row.name, row.amount, row.unit, lineCost);
        });
      });
    });

    const rows: (string | number)[][] = [];
    const sortedCategories = Array.from(categoryToAggregate.keys()).sort();
    for (const cat of sortedCategories) {
      (categoryToAggregate.get(cat) ?? []).forEach(it => {
        const unitPrice = it.amount > 0 ? it.cost / it.amount : 0;
        const lineTotal = roundExportNumber(it.cost);
        rows.push([cat, it.name, roundExportNumber(it.amount), heUnit(it.unit), roundExportNumber(unitPrice), lineTotal]);
      });
    }

    return {
      title: `${menu.name_ ?? 'Menu'} — Shopping list`,
      exportedAt: new Date().toISOString(),
      sections: [
        { headerRow: ['Category', 'Ingredient', 'Amount', 'Unit', 'Unit price', 'Line total'], rows }
      ]
    };
  }

  /**
   * Export shopping list: ingredients grouped by category; unit price and line total (formula) for reactivity.
   * Filename: shopping-list_{name}_{date}.xlsx
   */
  async exportShoppingList(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor
      }))
    };
    const products = this.kitchenState_.products_();

    const categoryToRows = new Map<string, { name: string; amount: number; unit: string; unitPrice: number }[]>();
    scaledIngredients.forEach((row, i) => {
      const category = row.type === 'product'
        ? (products.find(p => p._id === row.referenceId) as Product | undefined)?.categories_?.[0] ?? 'כללי'
        : 'הכנות';
      const ing = scaledRecipe.ingredients_[i];
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
      const unitPrice = row.amount > 0 ? cost / row.amount : 0;
      const arr = categoryToRows.get(category) ?? [];
      arr.push({ name: row.name, amount: row.amount, unit: row.unit, unitPrice });
      categoryToRows.set(category, arr);
    });

    const wb = new Workbook();
    const ws = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] });
    ws.addRow([heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit'), heHeader('unit_price'), heHeader('line_total')]);
    this.styleHeaderRow(ws, 1);
    let rowNum = 2;
    const sortedCategories = Array.from(categoryToRows.keys()).sort();
    for (const cat of sortedCategories) {
      const items = categoryToRows.get(cat) ?? [];
      items.forEach(it => {
        const row = ws.getRow(rowNum);
        row.getCell(1).value = cat;
        row.getCell(2).value = it.name;
        row.getCell(3).value = roundExportNumber(it.amount);
        row.getCell(4).value = heUnit(it.unit);
        row.getCell(5).value = roundExportNumber(it.unitPrice);
        row.getCell(6).value = { formula: `C${rowNum}*E${rowNum}` };
        this.styleDataRow(ws, rowNum++);
      });
    }
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 12;
    ws.getColumn(6).width = 12;

    const fileName = buildExportFileName('shopping-list', recipe.name_hebrew ?? 'recipe');
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export menu as Excel: cover sheet + one sheet per section.
   * Filename: menu-info_{menuName}.xlsx (no date for menu).
   */
  async exportMenuInfo(menu: MenuEvent, _recipes: Recipe[]): Promise<void> {
    const wb = new Workbook();

    const coverWs = wb.addWorksheet('Menu info');
    const coverData: (string | number)[][] = [
      [heHeader('menu_name'), menu.name_ ?? ''],
      [heHeader('event_type'), menu.event_type_ ?? ''],
      [heHeader('date'), menu.event_date_ ?? ''],
      [heHeader('guest_count'), menu.guest_count_ ?? 0],
      [heHeader('pieces_per_person'), menu.pieces_per_person_ ?? '']
    ];
    coverData.forEach(row => coverWs.addRow(row));
    coverWs.getColumn(1).width = 18;
    coverWs.getColumn(2).width = 24;

    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
    const recipeMap = new Map(_recipes.map(r => [r._id, r]));

    sections.forEach((section: MenuSection) => {
      const sheetName = (section.name_ ?? `Section_${section._id}`).slice(0, 31);
      const ws = wb.addWorksheet(sheetName);
      ws.addRow([heHeader('dish_name'), heHeader('portions'), heHeader('take_rate'), heHeader('sell_price')]);
      this.styleHeaderRow(ws, 1);
      let rowNum = 2;
      (section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        const name = recipe?.name_hebrew ?? item.recipe_id_;
        ws.addRow([
          name,
          roundExportNumber(item.derived_portions_ ?? 0),
          roundExportNumber(item.predicted_take_rate_ ?? 0),
          item.sell_price_ !== undefined && item.sell_price_ !== null
            ? roundExportNumber(Number(item.sell_price_))
            : ''
        ]);
        this.styleDataRow(ws, rowNum++);
      });
      ws.getColumn(1).width = 32;
      ws.getColumn(2).width = 12;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 12;
    });

    const fileName = buildExportFileName('menu-info', menu.name_ ?? 'menu', { includeDate: false });
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export menu shopping list: all dishes' ingredients scaled by derived_portions_, grouped by category; unit price and line total (formula).
   * Filename: shopping-list_{menuName}.xlsx (no date for menu).
   */
  async exportMenuShoppingList(menu: MenuEvent, recipes: Recipe[], products: Product[]): Promise<void> {
    const recipeMap = new Map(recipes.map(r => [r._id, r]));
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; cost: number }[]>();

    const addRow = (category: string, name: string, amount: number, unit: string, lineCost: number): void => {
      const arr = categoryToAggregate.get(category) ?? [];
      const existing = arr.find(x => x.name === name && x.unit === unit);
      if (existing) {
        existing.amount += amount;
        existing.cost += lineCost;
      } else {
        arr.push({ name, amount, unit, cost: lineCost });
      }
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
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
            ...ing,
            amount_: (ing.amount_ ?? 0) * factor
          }))
        };
        scaled.forEach((row, i) => {
          const category = row.type === 'product'
            ? (products.find(p => p._id === row.referenceId)?.categories_?.[0] ?? 'כללי')
            : 'הכנות';
          const ing = scaledRecipe.ingredients_[i];
          const lineCost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
          addRow(category, row.name, row.amount, row.unit, lineCost);
        });
      });
    });

    const wb = new Workbook();
    const ws = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] });
    ws.addRow(['Category', 'Ingredient', 'Amount', 'Unit', 'Unit price', 'Line total']);
    this.styleHeaderRow(ws, 1);
    let rowNum = 2;
    const sortedCategories = Array.from(categoryToAggregate.keys()).sort();
    for (const cat of sortedCategories) {
      (categoryToAggregate.get(cat) ?? []).forEach(it => {
        const unitPrice = it.amount > 0 ? it.cost / it.amount : 0;
        const row = ws.getRow(rowNum);
        row.getCell(1).value = cat;
        row.getCell(2).value = it.name;
        row.getCell(3).value = roundExportNumber(it.amount);
        row.getCell(4).value = heUnit(it.unit);
        row.getCell(5).value = roundExportNumber(unitPrice);
        row.getCell(6).value = { formula: `C${rowNum}*E${rowNum}` };
        this.styleDataRow(ws, rowNum++);
      });
    }
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 12;
    ws.getColumn(6).width = 12;

    const fileName = buildExportFileName('shopping-list', menu.name_ ?? 'menu', { includeDate: false });
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Build payload for menu checklist preview (same structure as export).
   */
  getMenuChecklistPreviewPayload(menu: MenuEvent, recipes: Recipe[], mode: 'by_dish' | 'by_category' | 'by_station'): ExportPayload {
    const recipeMap = new Map(recipes.map(r => [r._id, r]));
    const modeLabel = mode === 'by_dish' ? 'by_dish' : mode === 'by_station' ? 'by_station' : 'by_category';

    if (mode === 'by_dish') {
      const sections: ExportSection[] = [];
      const menuSections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
      for (const section of menuSections) {
        for (const item of section.items_ ?? []) {
          const recipe = recipeMap.get(item.recipe_id_);
          if (!recipe) continue;
          const portions = item.derived_portions_ ?? 0;
          const yieldAmount = recipe.yield_amount_ || 1;
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0;
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
          if (prepRows.length === 0) continue;
          const sortedPrep = [...prepRows].sort((a, b) => {
            const catA = a.category_name ?? '';
            const catB = b.category_name ?? '';
            return catA.localeCompare(catB) || a.name.localeCompare(b.name);
          });
          const rows: (string | number)[][] = sortedPrep.map(pr => [
            pr.name,
            pr.category_name ?? '',
            roundExportNumber(pr.amount),
            heUnit(pr.unit)
          ]);
          sections.push({
            title: `${heHeader('dish')}: ${recipe.name_hebrew ?? item.recipe_id_} (${heHeader('portions')}: ${portions})`,
            headerRow: [heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')],
            rows
          });
        }
      }
      return {
        title: `${menu.name_ ?? 'Menu'} — ${heHeader('checklist')}`,
        subtitle: modeLabel,
        exportedAt: new Date().toISOString(),
        sections
      };
    }

    const groupKey = mode === 'by_station' ? 'station' : 'category';
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string }[]>();

    const addPrep = (key: string, name: string, amount: number, unit: string): void => {
      const arr = categoryToAggregate.get(key) ?? [];
      const existing = arr.find(x => x.name === name && x.unit === unit);
      if (existing) existing.amount += amount;
      else arr.push({ name, amount, unit });
      categoryToAggregate.set(key, arr);
    };

    (menu.sections_ ?? []).forEach((section: MenuSection) => {
      (section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        if (!recipe) return;
        const portions = item.derived_portions_ ?? 0;
        const yieldAmount = recipe.yield_amount_ || 1;
        const factor = yieldAmount > 0 ? portions / yieldAmount : 0;
        const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
        prepRows.forEach(pr => {
          const key = mode === 'by_station'
            ? (recipe.default_station_ ?? 'כללי')
            : (pr.category_name ?? 'כללי');
          addPrep(key, pr.name, pr.amount, pr.unit);
        });
      });
    });

    const sortedGroups = Array.from(categoryToAggregate.keys()).sort();
    const accRows: (string | number)[][] = [];
    for (const cat of sortedGroups) {
      const items = categoryToAggregate.get(cat) ?? [];
      items.forEach(it => accRows.push([cat, it.name, roundExportNumber(it.amount), heUnit(it.unit)]));
    }
    const headerAcc = groupKey === 'station' ? [heHeader('station'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit')] : [heHeader('category'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit')];

    return {
      title: `${menu.name_ ?? 'Menu'} — ${heHeader('checklist')}`,
      subtitle: modeLabel,
      exportedAt: new Date().toISOString(),
      sections: [{ title: heHeader('accumulated'), headerRow: headerAcc, rows: accRows }]
    };
  }

  /**
   * Export menu checklist (mise en place / prep items). Mode: by_dish | by_category | by_station.
   * When by_dish: one sheet per dish. When by_category or by_station: one Accumulated sheet only.
   * Filename: check-list_{menuName}.xlsx (no date for menu).
   */
  async exportChecklist(menu: MenuEvent, recipes: Recipe[], mode: 'by_dish' | 'by_category' | 'by_station'): Promise<void> {
    const recipeMap = new Map(recipes.map(r => [r._id, r]));
    const wb = new Workbook();

    if (mode === 'by_dish') {
      const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] });
      const numCols = 4;
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
          const sortedPrep = [...prepRows].sort((a, b) => {
            const catA = a.category_name ?? '';
            const catB = b.category_name ?? '';
            return catA.localeCompare(catB) || a.name.localeCompare(b.name);
          });

          ws.addRow([recipe.name_hebrew ?? item.recipe_id_]);
          this.styleExcelTitle(ws, rowNum++, numCols);
          ws.addRow([`${heHeader('portions')}: ${portions}`]);
          this.styleExcelSubtitle(ws, rowNum++, numCols);
          ws.addRow([heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')]);
          this.styleExcelColumnHeader(ws, rowNum++, numCols);
          sortedPrep.forEach(pr => {
            ws.addRow([pr.name, pr.category_name ?? '', roundExportNumber(pr.amount), heUnit(pr.unit)]);
            this.styleExcelDataRowBorders(ws, rowNum++, numCols);
          });
          ws.addRow([]);
          this.styleExcelSeparator(ws, rowNum++);
        }
      }
      ws.getColumn(1).width = 28;
      ws.getColumn(2).width = 14;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 10;
    } else {
      const groupKey = mode === 'by_station' ? 'station' : 'category';
      const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string }[]>();

      const addPrep = (key: string, name: string, amount: number, unit: string): void => {
        const arr = categoryToAggregate.get(key) ?? [];
        const existing = arr.find(x => x.name === name && x.unit === unit);
        if (existing) existing.amount += amount;
        else arr.push({ name, amount, unit });
        categoryToAggregate.set(key, arr);
      };

      (menu.sections_ ?? []).forEach((section: MenuSection) => {
        (section.items_ ?? []).forEach((item: MenuItemSelection) => {
          const recipe = recipeMap.get(item.recipe_id_);
          if (!recipe) return;
          const portions = item.derived_portions_ ?? 0;
          const yieldAmount = recipe.yield_amount_ || 1;
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0;
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
          prepRows.forEach(pr => {
            const key = mode === 'by_station'
              ? (recipe.default_station_ ?? 'כללי')
              : (pr.category_name ?? 'כללי');
            addPrep(key, pr.name, pr.amount, pr.unit);
          });
        });
      });

      const sortedGroups = Array.from(categoryToAggregate.keys()).sort();

      const wsAcc = wb.addWorksheet('Accumulated', { views: [{ rightToLeft: true }] });
      wsAcc.addRow([groupKey === 'station' ? heHeader('station') : heHeader('category'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]);
      this.styleHeaderRow(wsAcc, 1);
      let rowNumAcc = 2;
      for (const cat of sortedGroups) {
        wsAcc.addRow([cat, '', '', '']);
        const catRow = wsAcc.getRow(rowNumAcc);
        catRow.font = { bold: true };
        catRow.alignment = { wrapText: true, vertical: 'top' };
        rowNumAcc++;
        const items = categoryToAggregate.get(cat) ?? [];
        items.forEach(it => {
          wsAcc.addRow(['', it.name, roundExportNumber(it.amount), heUnit(it.unit)]);
          this.styleDataRow(wsAcc, rowNumAcc++);
        });
      }
      wsAcc.getColumn(1).width = 20;
      wsAcc.getColumn(2).width = 28;
      wsAcc.getColumn(3).width = 12;
      wsAcc.getColumn(4).width = 10;
    }

    const fileName = buildExportFileName('check-list', menu.name_ ?? 'menu', { includeDate: false });
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export all together (menu): one workbook with sheet 1 = menu info, then checklist (default by_category), then shopping list.
   * Filename: all_{menuName}.xlsx
   */
  async exportAllTogetherMenu(
    menu: MenuEvent,
    recipes: Recipe[],
    products: Product[],
    checklistMode: 'by_dish' | 'by_category' | 'by_station' = 'by_category'
  ): Promise<void> {
    const wb = new Workbook();
    const recipeMap = new Map(recipes.map(r => [r._id, r]));

    const coverWs = wb.addWorksheet('Menu info', { views: [{ rightToLeft: true }] });
    coverWs.addRow([heHeader('exported_at'), exportDateStr()]);
    coverWs.addRow([heHeader('menu_name'), menu.name_ ?? '']);
    coverWs.addRow([heHeader('event_type'), menu.event_type_ ?? '']);
    coverWs.addRow([heHeader('date'), menu.event_date_ ?? '']);
    coverWs.addRow([heHeader('guest_count'), menu.guest_count_ ?? 0]);
    coverWs.addRow([heHeader('pieces_per_person'), menu.pieces_per_person_ ?? '']);
    this.styleHeaderRow(coverWs, 1);
    coverWs.getColumn(1).width = 18;
    coverWs.getColumn(2).width = 24;

    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
    sections.forEach((section: MenuSection) => {
      const sheetName = (section.name_ ?? `Section_${section._id}`).slice(0, 31);
      const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });
      ws.addRow([heHeader('dish_name'), heHeader('portions'), heHeader('take_rate'), heHeader('sell_price')]);
      this.styleHeaderRow(ws, 1);
      let rowNum = 2;
      (section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        const name = recipe?.name_hebrew ?? item.recipe_id_;
        ws.addRow([
          name,
          roundExportNumber(item.derived_portions_ ?? 0),
          roundExportNumber(item.predicted_take_rate_ ?? 0),
          item.sell_price_ !== undefined && item.sell_price_ !== null ? roundExportNumber(Number(item.sell_price_)) : ''
        ]);
        this.styleDataRow(ws, rowNum++);
      });
      ws.getColumn(1).width = 32;
      ws.getColumn(2).width = 12;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 12;
    });

    await this.addChecklistSheetsToWorkbook(wb, menu, recipeMap, checklistMode);
    await this.addMenuShoppingListSheetToWorkbook(wb, menu, recipeMap, products);

    const fileName = buildExportFileName('all', menu.name_ ?? 'menu', { includeDate: false });
    await this.downloadWorkbook(wb, fileName);
  }

  /**
   * Export all together (recipe/dish): sheet 1 = recipe sheet (Plan 108), sheet 2 = shopping list.
   * Filename: all_{recipeName}_{date}.xlsx
   */
  async exportAllTogetherRecipe(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity);
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor);
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({ ...ing, amount_: (ing.amount_ ?? 0) * factor }))
    };

    const wb = new Workbook();
    const ws1 = wb.addWorksheet(heHeader('info'), { views: [{ rightToLeft: true }] });
    this.fillRecipeSheetWorksheet(ws1, recipe, quantity);

    const products = this.kitchenState_.products_();
    const categoryToRows = new Map<string, { name: string; amount: number; unit: string; unitPrice: number }[]>();
    scaledIngredients.forEach((row, i) => {
      const category = row.type === 'product'
        ? (products.find(p => p._id === row.referenceId) as Product | undefined)?.categories_?.[0] ?? 'כללי'
        : 'הכנות';
      const ing = scaledRecipe.ingredients_[i];
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0;
      const unitPrice = row.amount > 0 ? cost / row.amount : 0;
      const arr = categoryToRows.get(category) ?? [];
      arr.push({ name: row.name, amount: row.amount, unit: row.unit, unitPrice });
      categoryToRows.set(category, arr);
    });

    const ws2 = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] });
    ws2.addRow([heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit'), heHeader('unit_price'), heHeader('line_total')]);
    this.styleHeaderRow(ws2, 1);
    let rowNum2 = 2;
    const sortedCategories = Array.from(categoryToRows.keys()).sort();
    for (const cat of sortedCategories) {
      (categoryToRows.get(cat) ?? []).forEach(it => {
        const row = ws2.getRow(rowNum2);
        row.getCell(1).value = cat;
        row.getCell(2).value = it.name;
        row.getCell(3).value = roundExportNumber(it.amount);
        row.getCell(4).value = heUnit(it.unit);
        row.getCell(5).value = roundExportNumber(it.unitPrice);
        row.getCell(6).value = { formula: `C${rowNum2}*E${rowNum2}` };
        this.styleDataRow(ws2, rowNum2++);
      });
    }
    ws2.getColumn(1).width = 18;
    ws2.getColumn(2).width = 28;
    ws2.getColumn(3).width = 12;
    ws2.getColumn(4).width = 10;
    ws2.getColumn(5).width = 12;
    ws2.getColumn(6).width = 12;

    const fileName = buildExportFileName('all', recipe.name_hebrew ?? 'recipe');
    await this.downloadWorkbook(wb, fileName);
  }

  private addChecklistSheetsToWorkbook(
    wb: Workbook,
    menu: MenuEvent,
    recipeMap: Map<string, Recipe>,
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): void {
    const recipes = Array.from(recipeMap.values());
    if (mode === 'by_dish') {
      const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] });
      const numCols = 4;
      let rowNum = 1;
      const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0));
      for (const section of sections) {
        for (const item of section.items_ ?? []) {
          const recipe = recipeMap.get(item.recipe_id_);
          if (!recipe) continue;
          const portions = item.derived_portions_ ?? 0;
          const yieldAmount = recipe.yield_amount_ || 1;
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0;
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
          if (prepRows.length === 0) continue;
          ws.addRow([recipe.name_hebrew ?? item.recipe_id_]);
          this.styleExcelTitle(ws, rowNum++, numCols);
          ws.addRow([`${heHeader('portions')}: ${portions}`]);
          this.styleExcelSubtitle(ws, rowNum++, numCols);
          ws.addRow([heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')]);
          this.styleExcelColumnHeader(ws, rowNum++, numCols);
          prepRows.forEach(pr => {
            ws.addRow([pr.name, pr.category_name ?? '', roundExportNumber(pr.amount), heUnit(pr.unit)]);
            this.styleExcelDataRowBorders(ws, rowNum++, numCols);
          });
          ws.addRow([]);
          this.styleExcelSeparator(ws, rowNum++);
        }
      }
      ws.getColumn(1).width = 28;
      ws.getColumn(2).width = 14;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 10;
    } else {
      const groupKey = mode === 'by_station' ? 'station' : 'category';
      const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string }[]>();
      const byDishRows: { groupKey: string; name: string; amount: number; unit: string; dishName: string }[] = [];
      const addPrep = (key: string, name: string, amount: number, unit: string, dishName: string): void => {
        const arr = categoryToAggregate.get(key) ?? [];
        const existing = arr.find(x => x.name === name && x.unit === unit);
        if (existing) existing.amount += amount;
        else arr.push({ name, amount, unit });
        categoryToAggregate.set(key, arr);
        byDishRows.push({ groupKey: key, name, amount, unit, dishName });
      };
      (menu.sections_ ?? []).forEach((section: MenuSection) => {
        (section.items_ ?? []).forEach((item: MenuItemSelection) => {
          const recipe = recipeMap.get(item.recipe_id_);
          if (!recipe) return;
          const portions = item.derived_portions_ ?? 0;
          const factor = (recipe.yield_amount_ || 1) > 0 ? portions / (recipe.yield_amount_ || 1) : 0;
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor);
          const dishName = recipe.name_hebrew ?? item.recipe_id_;
          prepRows.forEach(pr => {
            const key = mode === 'by_station' ? (recipe.default_station_ ?? 'כללי') : (pr.category_name ?? 'כללי');
            addPrep(key, pr.name, pr.amount, pr.unit, dishName);
          });
        });
      });
      const sortedGroups = Array.from(categoryToAggregate.keys()).sort();
      const wsAcc = wb.addWorksheet('Checklist Accumulated', { views: [{ rightToLeft: true }] });
      wsAcc.addRow([groupKey === 'station' ? heHeader('station') : heHeader('category'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]);
      this.styleHeaderRow(wsAcc, 1);
      let r = 2;
      for (const cat of sortedGroups) {
        wsAcc.addRow([cat, '', '', '']);
        wsAcc.getRow(r).font = { bold: true };
        r++;
        (categoryToAggregate.get(cat) ?? []).forEach(it => {
          wsAcc.addRow(['', it.name, roundExportNumber(it.amount), heUnit(it.unit)]);
          this.styleDataRow(wsAcc, r++);
        });
      }
      const wsByDish = wb.addWorksheet('Checklist By dish', { views: [{ rightToLeft: true }] });
      wsByDish.addRow([groupKey === 'station' ? heHeader('station') : heHeader('category'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit'), heHeader('dish')]);
      this.styleHeaderRow(wsByDish, 1);
      let r2 = 2;
      for (const cat of sortedGroups) {
        byDishRows.filter(x => x.groupKey === cat).forEach(rr => {
          wsByDish.addRow([cat, rr.name, roundExportNumber(rr.amount), heUnit(rr.unit), rr.dishName]);
          this.styleDataRow(wsByDish, r2++);
        });
      }
    }
  }

  private addMenuShoppingListSheetToWorkbook(
    wb: Workbook,
    menu: MenuEvent,
    recipeMap: Map<string, Recipe>,
    products: Product[]
  ): void {
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; cost: number }[]>();
    const addRow = (category: string, name: string, amount: number, unit: string, lineCost: number): void => {
      const arr = categoryToAggregate.get(category) ?? [];
      const existing = arr.find(x => x.name === name && x.unit === unit);
      if (existing) {
        existing.amount += amount;
        existing.cost += lineCost;
      } else {
        arr.push({ name, amount, unit, cost: lineCost });
      }
      categoryToAggregate.set(category, arr);
    };
    (menu.sections_ ?? []).forEach((section: MenuSection) => {
      (section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_);
        if (!recipe?.ingredients_?.length) return;
        const portions = item.derived_portions_ ?? 0;
        const factor = (recipe.yield_amount_ || 1) > 0 ? portions / (recipe.yield_amount_ || 1) : 0;
        const scaled = this.scaling_.getScaledIngredients(recipe, factor);
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients_: (recipe.ingredients_ ?? []).map(ing => ({ ...ing, amount_: (ing.amount_ ?? 0) * factor }))
        };
        scaled.forEach((row, i) => {
          const category = row.type === 'product'
            ? (products.find(p => p._id === row.referenceId)?.categories_?.[0] ?? 'כללי')
            : 'הכנות';
          const ing = scaledRecipe.ingredients_[i];
          addRow(category, row.name, row.amount, row.unit, ing ? this.recipeCost_.getCostForIngredient(ing) : 0);
        });
      });
    });
    const ws = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] });
    ws.addRow([heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit'), heHeader('unit_price'), heHeader('line_total')]);
    this.styleHeaderRow(ws, 1);
    let rowNum = 2;
    for (const cat of Array.from(categoryToAggregate.keys()).sort()) {
      (categoryToAggregate.get(cat) ?? []).forEach(it => {
        const unitPrice = it.amount > 0 ? it.cost / it.amount : 0;
        const row = ws.getRow(rowNum);
        row.getCell(1).value = cat;
        row.getCell(2).value = it.name;
        row.getCell(3).value = roundExportNumber(it.amount);
        row.getCell(4).value = heUnit(it.unit);
        row.getCell(5).value = roundExportNumber(unitPrice);
        row.getCell(6).value = { formula: `C${rowNum}*E${rowNum}` };
        this.styleDataRow(ws, rowNum++);
      });
    }
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 12;
    ws.getColumn(6).width = 12;
  }
}
