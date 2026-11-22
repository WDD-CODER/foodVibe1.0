/**
 * Pure Excel workbook helpers and constants.
 * Extracted from ExportService — no Angular DI, no class.
 * Plan: refactor/split-export-service
 */

import type { CellValue, PageSetup, Workbook, Worksheet, WorksheetView } from 'exceljs'

import type { ScalingService } from './scaling.service'
import type { RecipeCostService } from './recipe-cost.service'
import type { TranslationService } from './translation.service'
import { Recipe, RecipeStep } from '@models/recipe.model'
import { exportDateStr, heHeader, heUnit, roundExportNumber, type RecipeSheetBlock } from '../utils/export.util'

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
      right: EXCEL_BORDER_THIN
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
      right: EXCEL_BORDER_THIN
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
export function styleExcelBlockBorder(ws: Worksheet, startRow: number, endRow: number, numCols: number): void {
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

// ── House style (plan 471) ─────────────────────────────────────────────────────

/** A4, portrait, one page wide — every export sheet prints this way. */
export const HOUSE_PAGE_SETUP: Partial<PageSetup> = {
  paperSize: 9,
  orientation: 'portrait',
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0
}

/** Rows 1–3 (title, meta, header) stay in view while scrolling; the sheet reads right to left. */
export const HOUSE_TABLE_VIEW: Partial<WorksheetView> = { rightToLeft: true, state: 'frozen', ySplit: 3 }

/** First data row of every house-style table sheet (rows 1–3 are title, meta, header). */
export const HOUSE_FIRST_DATA_ROW = 4

/** An Excel-safe sheet name: no `\ / * ? : [ ]`, at most 31 characters, unique within `used` (which it extends). */
export function uniqueSheetName(title: string, used: Set<string>, fallback: string): string {
  const clean = (text: string): string =>
    text
      .replace(/[\\/*?:[\]]/g, ' ')
      .trim()
      .slice(0, 27)
  const base = clean(title) || clean(fallback) || '-'
  let name = base
  for (let n = 2; used.has(name); n++) name = `${base} ${n}`
  used.add(name)
  return name
}

/** What one house-style table sheet shows. */
export interface StyledTableSheetSpec {
  /** Wanted sheet name; made Excel-safe and unique by `uniqueSheetName`. */
  name: string
  /** Used when `name` is empty after cleaning; defaults to `title`. */
  fallbackName?: string
  /** Row 1, the teal band. */
  title: string
  /** Row 2, the grey italic line. */
  meta: string
  /** Row 3, the grey column header. */
  header: CellValue[]
  /** Rows 4…, thin borders. */
  rows: CellValue[][]
  /** Last row, bold. */
  totalRow?: CellValue[]
  /** Column widths; default 28 for the first column and 14 for the others. */
  widths?: number[]
}

/**
 * The one house style for every Excel table sheet (plan 471): RTL, title band, meta line, grey header,
 * bordered rows, optional bold total row, frozen header, A4 portrait fit to one page wide.
 */
export function addStyledTableSheet(wb: Workbook, spec: StyledTableSheetSpec): Worksheet {
  const used = new Set(wb.worksheets.map((w) => w.name))
  const ws = wb.addWorksheet(uniqueSheetName(spec.name, used, spec.fallbackName ?? spec.title), {
    views: [{ ...HOUSE_TABLE_VIEW }],
    pageSetup: { ...HOUSE_PAGE_SETUP }
  })
  const numCols = Math.max(spec.header.length, 1)
  ws.addRow([spec.title])
  styleExcelTitle(ws, 1, numCols)
  ws.addRow([spec.meta])
  styleExcelSubtitle(ws, 2, numCols)
  ws.addRow(spec.header)
  styleExcelColumnHeader(ws, 3, numCols)
  let rowNum = HOUSE_FIRST_DATA_ROW
  for (const row of spec.rows) {
    ws.addRow(row)
    styleExcelDataRowBorders(ws, rowNum++, numCols)
  }
  if (spec.totalRow) {
    ws.addRow(spec.totalRow)
    styleExcelDataRowBorders(ws, rowNum, numCols)
    ws.getRow(rowNum).font = { bold: true }
  }
  for (let c = 1; c <= numCols; c++) ws.getColumn(c).width = spec.widths?.[c - 1] ?? (c === 1 ? 28 : 14)
  return ws
}

// ── Category label ─────────────────────────────────────────────────────────────

/** Translate a preparation category using TranslationService (Hebrew label when in dictionary). */
export function heCategoryLabel(translation: TranslationService, cat: string | undefined): string {
  return translation.translate(cat ?? '')
}

// ── Recipe sheet helpers ───────────────────────────────────────────────────────

/** Build recipe-sheet block (header, yield, instructions, prep time). Plan 108. */
export function buildRecipeSheetBlock(recipe: Recipe, quantity: number): RecipeSheetBlock {
  const steps = (recipe.steps ?? []) as RecipeStep[]
  const isDish =
    recipe.recipeType === 'dish' || (recipe.prepItems?.length ?? 0) > 0 || (recipe.prepCategories?.length ?? 0) > 0
  const preparationInstructions = isDish
    ? steps.length
      ? steps.map((s) => (s.instruction ?? '').trim()).filter(Boolean)
      : []
    : steps.map((s) => (s.instruction ?? '').trim()).filter(Boolean)
  const preparationTime = steps.reduce((sum, s) => sum + (s.laborTimeMinutes ?? 0), 0)
  return {
    date: exportDateStr(),
    recipeName: recipe.nameHebrew ?? '',
    yieldQty: quantity,
    yieldUnit: heUnit(recipe.yieldUnit ?? 'unit'),
    preparationInstructions,
    preparationTime
  }
}

/**
 * Add the recipe-info sheet: the single-sheet block layout of plan 108 (a form, not a table) under the house
 * title band and meta line, right to left, A4 portrait fit to one page wide (plan 471).
 */
export function addRecipeInfoSheet(
  wb: Workbook,
  recipe: Recipe,
  quantity: number,
  heading: { name: string; title: string; meta: string },
  deps: { scaling: ScalingService; recipeCost: RecipeCostService }
): Worksheet {
  const used = new Set(wb.worksheets.map((w) => w.name))
  const ws = wb.addWorksheet(uniqueSheetName(heading.name, used, heading.title), {
    views: [{ rightToLeft: true }],
    pageSetup: { ...HOUSE_PAGE_SETUP }
  })
  ws.addRow([heading.title])
  styleExcelTitle(ws, 1, 4)
  ws.addRow([heading.meta])
  styleExcelSubtitle(ws, 2, 4)
  fillRecipeSheetWorksheet(ws, recipe, quantity, deps, 3)
  return ws
}

/** Fill a worksheet with single-sheet recipe layout, starting at `firstRow`. Plan 108. */
export function fillRecipeSheetWorksheet(
  ws: Worksheet,
  recipe: Recipe,
  quantity: number,
  deps: { scaling: ScalingService; recipeCost: RecipeCostService },
  firstRow = 1
): void {
  const factor = deps.scaling.getScaleFactor(recipe, quantity)
  const scaledIngredients = deps.scaling.getScaledIngredients(recipe, factor)
  const scaledRecipe: Recipe = {
    ...recipe,
    ingredients: (recipe.ingredients ?? []).map((ing) => ({ ...ing, amount: (ing.amount ?? 0) * factor }))
  }
  const sheetBlock = buildRecipeSheetBlock(recipe, quantity)
  const numCols = 4
  let rowNum = firstRow

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
    const ing = scaledRecipe.ingredients[i]
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
    sheetBlock.preparationInstructions.forEach((line) => {
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
