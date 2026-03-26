/**
 * Pure Excel workbook helpers and constants.
 * Extracted from ExportService — no Angular DI, no class.
 * Plan: refactor/split-export-service
 */

import type { Workbook, Worksheet } from 'exceljs'

import type { ScalingService } from './scaling.service'
import type { RecipeCostService } from './recipe-cost.service'
import type { TranslationService } from './translation.service'
import { Recipe, RecipeStep } from '@models/recipe.model'
import {
  exportDateStr,
  heHeader,
  heUnit,
  roundExportNumber,
  type RecipeSheetBlock,
} from '../utils/export.util'

// ── Constants ──────────────────────────────────────────────────────────────────

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const EXCEL_TEAL = 'FF009688'
export const EXCEL_HEADER_GRAY = 'FFE0E0E0'
export const EXCEL_SUBTITLE_GRAY = 'FFF5F5F5'
export const EXCEL_BORDER_THIN = { style: 'thin' as const }
export const EXCEL_BORDER_MEDIUM = { style: 'medium' as const }

// ── Download ───────────────────────────────────────────────────────────────────

/** Download workbook as .xlsx file. */
export async function downloadWorkbook(wb: Workbook, fileName: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// ── Row style helpers ──────────────────────────────────────────────────────────

/** Apply header row style (bold, wrapText). */
export function styleHeaderRow(ws: Worksheet, rowNumber: number): void {
  const row = ws.getRow(rowNumber)
  row.font = { bold: true }
  row.alignment = { wrapText: true, vertical: 'top' }
}

/** Apply wrapText to a data row. */
export function styleDataRow(ws: Worksheet, rowNumber: number): void {
  const row = ws.getRow(rowNumber)
  row.alignment = { wrapText: true, vertical: 'top' }
}

/** Merge cells in row across colSpan; style as title (teal fill, white bold). */
export function styleExcelTitle(
  ws: Worksheet,
  rowNum: number,
  colSpan: number,
  horizontal: 'right' | 'center' = 'right'
): void {
  if (colSpan > 1) ws.mergeCells(rowNum, 1, rowNum, colSpan)
  const row = ws.getRow(rowNum)
  row.height = 22
  const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: EXCEL_TEAL } }
  const font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  const alignment = { horizontal, vertical: 'middle' as const, wrapText: true }
  for (let c = 1; c <= colSpan; c++) {
    const cell = row.getCell(c)
    cell.fill = { ...fill }
    cell.font = { ...font }
    cell.alignment = { ...alignment }
  }
}

/** Merge cells in row across colSpan; style as subtitle (light gray, italic). */
export function styleExcelSubtitle(ws: Worksheet, rowNum: number, colSpan: number): void {
  if (colSpan > 1) ws.mergeCells(rowNum, 1, rowNum, colSpan)
  const row = ws.getRow(rowNum)
  row.height = 18
  const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: EXCEL_SUBTITLE_GRAY } }
  const font = { size: 11, italic: true }
  const alignment = { horizontal: 'right' as const, vertical: 'middle' as const, wrapText: true }
  for (let c = 1; c <= colSpan; c++) {
    const cell = row.getCell(c)
    cell.fill = { ...fill }
    cell.font = { ...font }
    cell.alignment = { ...alignment }
  }
}

/** Style row as column header: gray fill, bold, thin borders. */
export function styleExcelColumnHeader(ws: Worksheet, rowNum: number, numCols: number): void {
  const row = ws.getRow(rowNum)
  const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: EXCEL_HEADER_GRAY } }
  const font = { bold: true, size: 10 }
  const alignment = { horizontal: 'right' as const, vertical: 'top' as const, wrapText: true }
  for (let c = 1; c <= numCols; c++) {
    const cell = row.getCell(c)
    cell.fill = { ...fill }
    cell.font = { ...font }
    cell.alignment = { ...alignment }
    cell.border = {
      top: EXCEL_BORDER_THIN,
      left: EXCEL_BORDER_THIN,
      bottom: EXCEL_BORDER_THIN,
      right: EXCEL_BORDER_THIN,
    }
  }
}

/** Add thin borders to all cells in a data row. */
export function styleExcelDataRowBorders(ws: Worksheet, rowNum: number, numCols: number): void {
  const row = ws.getRow(rowNum)
  for (let c = 1; c <= numCols; c++) {
    row.getCell(c).border = {
      top: EXCEL_BORDER_THIN,
      left: EXCEL_BORDER_THIN,
      bottom: EXCEL_BORDER_THIN,
      right: EXCEL_BORDER_THIN,
    }
  }
  row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }
}

/** Separator row: small height, light gray fill. */
export function styleExcelSeparator(ws: Worksheet, rowNum: number, numCols: number): void {
  const row = ws.getRow(rowNum)
  row.height = 8
  const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: EXCEL_SUBTITLE_GRAY } }
  for (let c = 1; c <= numCols; c++) {
    row.getCell(c).fill = { ...fill }
  }
}

/** Blank row between blocks: small height, no fill. */
export function styleExcelBlankRow(ws: Worksheet, rowNum: number): void {
  ws.getRow(rowNum).height = 10
}

/** Apply bold (medium) border around the perimeter of a block. */
export function styleExcelBlockBorder(
  ws: Worksheet,
  startRow: number,
  endRow: number,
  numCols: number
): void {
  for (let c = 1; c <= numCols; c++) {
    const topCell = ws.getCell(startRow, c)
    topCell.border = { ...topCell.border, top: EXCEL_BORDER_MEDIUM }
    const bottomCell = ws.getCell(endRow, c)
    bottomCell.border = { ...bottomCell.border, bottom: EXCEL_BORDER_MEDIUM }
  }
  for (let r = startRow; r <= endRow; r++) {
    ws.getCell(r, 1).border = { ...ws.getCell(r, 1).border, left: EXCEL_BORDER_MEDIUM }
    ws.getCell(r, numCols).border = { ...ws.getCell(r, numCols).border, right: EXCEL_BORDER_MEDIUM }
  }
}

// ── Category label ─────────────────────────────────────────────────────────────

/** Translate a preparation category using TranslationService (Hebrew label when in dictionary). */
export function heCategoryLabel(translation: TranslationService, cat: string | undefined): string {
  return translation.translate(cat ?? '')
}

// ── Recipe sheet helpers ───────────────────────────────────────────────────────

/** Build recipe-sheet block (header, yield, instructions, prep time). Plan 108. */
export function buildRecipeSheetBlock(recipe: Recipe, quantity: number): RecipeSheetBlock {
  const steps = (recipe.steps_ ?? []) as RecipeStep[]
  const isDish =
    recipe.recipe_type_ === 'dish' ||
    (recipe.prep_items_?.length ?? 0) > 0 ||
    (recipe.prep_categories_?.length ?? 0) > 0
  const preparationInstructions = isDish
    ? steps.length
      ? steps.map(s => (s.instruction_ ?? '').trim()).filter(Boolean)
      : []
    : steps.map(s => (s.instruction_ ?? '').trim()).filter(Boolean)
  const preparationTime = steps.reduce((sum, s) => sum + (s.labor_time_minutes_ ?? 0), 0)
  return {
    date: exportDateStr(),
    recipeName: recipe.name_hebrew ?? '',
    yieldQty: quantity,
    yieldUnit: heUnit(recipe.yield_unit_ ?? 'unit'),
    preparationInstructions,
    preparationTime,
  }
}

/** Fill a worksheet with single-sheet recipe layout. Plan 108. */
export function fillRecipeSheetWorksheet(
  ws: Worksheet,
  recipe: Recipe,
  quantity: number,
  deps: { scaling: ScalingService; recipeCost: RecipeCostService }
): void {
  const factor = deps.scaling.getScaleFactor(recipe, quantity)
  const scaledIngredients = deps.scaling.getScaledIngredients(recipe, factor)
  const scaledRecipe: Recipe = {
    ...recipe,
    ingredients_: (recipe.ingredients_ ?? []).map(ing => ({ ...ing, amount_: (ing.amount_ ?? 0) * factor })),
  }
  const sheetBlock = buildRecipeSheetBlock(recipe, quantity)
  const numCols = 4
  let rowNum = 1

  ws.addRow([heHeader('date'), sheetBlock.date])
  styleExcelDataRowBorders(ws, rowNum++, 2)
  ws.addRow([heHeader('recipe_name'), sheetBlock.recipeName])
  styleExcelDataRowBorders(ws, rowNum++, 2)
  ws.addRow([])
  styleExcelSeparator(ws, rowNum++, numCols)

  ws.addRow([heHeader('amount'), sheetBlock.yieldQty])
  styleExcelDataRowBorders(ws, rowNum++, 2)
  ws.addRow([heHeader('unit'), sheetBlock.yieldUnit])
  styleExcelDataRowBorders(ws, rowNum++, 2)
  ws.addRow([])
  styleExcelSeparator(ws, rowNum++, numCols)

  ws.addRow([heHeader('ingredients_header')])
  styleExcelTitle(ws, rowNum++, numCols)
  ws.addRow([heHeader('ingredients_header'), heHeader('amount'), heHeader('unit'), heHeader('unit_price')])
  styleExcelColumnHeader(ws, rowNum++, numCols)
  scaledIngredients.forEach((row, i) => {
    const ing = scaledRecipe.ingredients_[i]
    const cost = ing ? deps.recipeCost.getCostForIngredient(ing) : 0
    const unitPrice = row.amount > 0 ? cost / row.amount : 0
    ws.addRow([row.name, roundExportNumber(row.amount), heUnit(row.unit), roundExportNumber(unitPrice)])
    styleExcelDataRowBorders(ws, rowNum++, numCols)
  })
  ws.addRow([])
  styleExcelSeparator(ws, rowNum++, numCols)

  ws.addRow([heHeader('preparation_instructions')])
  styleExcelSubtitle(ws, rowNum++, numCols)
  if (sheetBlock.preparationInstructions.length) {
    sheetBlock.preparationInstructions.forEach(line => {
      ws.addRow([line])
      styleDataRow(ws, rowNum++)
    })
  } else {
    ws.addRow([''])
    rowNum++
  }
  ws.addRow([])
  styleExcelSeparator(ws, rowNum++, numCols)

  ws.addRow([heHeader('preparation_time'), roundExportNumber(sheetBlock.preparationTime)])
  styleExcelDataRowBorders(ws, rowNum, 2)

  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 28
  ws.getColumn(3).width = 12
  ws.getColumn(4).width = 14
}
