/**
 * Shared helpers and types for export (Excel + paper-style preview).
 * Plan: 102-unified-export-refactor, 107-export-localization-design.
 */

/** Hebrew labels for export column/field headers (fallback without async dictionary). */
export const EXPORT_HEADER_HE: Record<string, string> = {
  field: 'שדה',
  value: 'ערך',
  menu_name: 'שם תפריט',
  event_type: 'סוג אירוע',
  date: 'תאריך',
  guest_count: 'מספר סועדים',
  pieces_per_person: 'פריטים לסועד',
  dish_name: 'שם מנה',
  portions: 'מנות',
  take_rate: 'שיעור לקיחה',
  sell_price: 'מחיר מכירה',
  category: 'קטגוריה',
  ingredient: 'מוצר',
  amount: 'כמות',
  unit: "יח' מידה",
  unit_price: 'מחיר ליחידה',
  line_total: "סה״כ שורה",
  prep_item: 'פריט הכנה',
  quantity: 'כמות',
  dish: 'מנה',
  station: 'תחנה',
  cost: 'עלות',
  name: 'שם',
  type: 'סוג',
  yield: 'תפוקה',
  yield_unit: "יח' תפוקה",
  order: 'סדר',
  instruction: 'הנחיה',
  time_min: "זמן (דק')",
  exported_at: 'יוצא בתאריך',
  menu_info: 'פרטי תפריט',
  info: 'פרטים',
  ingredients: 'מרכיבים',
  accumulated: 'מצטבר',
  by_dish: 'לפי מנה',
  shopping_list: 'רשימת קניות',
  checklist: "צ'קליסט",
  scale: 'יחס',
  steps: 'שלבים',
  row_num: '#',
  /** Plan 108: recipe-sheet layout */
  recipe_name: 'שם המתכון',
  preparation_instructions: 'הוראות הכנה',
  preparation_time: 'זמן הכנה',
  ingredients_header: 'מצרכים',
  /** Menu all view: total food cost (₪), cost per 1 portion */
  food_cost_money: 'עלות מזון (₪)',
  dish_food_cost_per_portion: 'עלות למנה',
};

/** Map English base unit keys to Hebrew display (matches dictionary units). */
export const UNIT_HE: Record<string, string> = {
  kg: 'ק"ג',
  liter: 'ליטר',
  ml: 'מ"ל',
  milliliter: 'מיליליטר',
  unit: 'יחידה',
  gram: 'גרם',
  cup: 'כוס',
  tbsp: 'כף',
  tsp: 'כפית',
};

/** Return Hebrew header for export column/field key, or key if not mapped. */
export function heHeader(key: string): string {
  const direct = EXPORT_HEADER_HE[key];
  if (direct) return direct;
  const k = key.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
  const byNorm = EXPORT_HEADER_HE[k];
  if (byNorm) return byNorm;
  return key;
}

/** Return Hebrew unit label for display; falls back to original if not in UNIT_HE. */
export function heUnit(unit: string): string {
  if (!unit || typeof unit !== 'string') return unit ?? '';
  const u = unit.trim().toLowerCase();
  return UNIT_HE[u] ?? unit;
}

/** Round for export: 2 decimal places for amounts, currency, and percentages. */
export function roundExportNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Format a number for display in export (2 decimals). */
export function formatExportNumber(value: number): string {
  return roundExportNumber(value).toFixed(2);
}

/** Sanitize string for use in file names (replace invalid chars). */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\s\\/:*?"<>|]/g, '_').replace(/_+/g, '_') || 'export';
}

/** ISO date string (YYYY-MM-DD) for filenames and "exported at". */
export function exportDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ExportListType =
  | 'recipe-info'
  | 'shopping-list'
  | 'cooking-steps'
  | 'check-list'
  | 'menu-info'
  | 'all';

/**
 * Build export filename per plan: {list-type}[_{variant}]_{item-name}[_{date}].xlsx
 * - Recipe/dish: include date.
 * - Menu: no date in filename.
 * - variant: optional (e.g. 'by-dish', 'by-category', 'by-station') for checklists so the filename describes the export type.
 */
export function buildExportFileName(
  listType: ExportListType,
  itemName: string,
  options?: { includeDate?: boolean; variant?: string }
): string {
  const safeName = sanitizeFileName(itemName);
  const includeDate = options?.includeDate ?? true;
  const variant = options?.variant ? sanitizeFileName(options.variant) : '';
  const mid = variant ? `_${variant}` : '';
  if (includeDate) {
    return `${listType}${mid}_${safeName}_${exportDateStr()}.xlsx`;
  }
  return `${listType}${mid}_${safeName}.xlsx`;
}

/** One row in an export section (array of cell values). */
export type ExportSectionRow = (string | number)[];

/** A section (e.g. a category) with optional title and rows. */
export interface ExportSection {
  title?: string;
  headerRow?: ExportSectionRow;
  rows: ExportSectionRow[];
}

/** Summary block (e.g. total cost, food cost %). */
export interface ExportSummaryItem {
  label: string;
  value: string | number;
}

/** Recipe-sheet block (Plan 108): header, yield, instructions, prep time. Ingredients stay in sections. */
export interface RecipeSheetBlock {
  date: string;
  recipeName: string;
  yieldQty: number;
  yieldUnit: string;
  preparationInstructions: string[];
  preparationTime: number;
}

/** Labels for recipe-sheet preview (Hebrew from heHeader). */
export interface RecipeSheetLabels {
  date: string;
  recipeName: string;
  amount: string;
  unit: string;
  preparationInstructions: string;
  preparationTime: string;
  ingredients: string;
}

/** Payload for paper-style preview and for building Excel (single source of truth). */
export interface ExportPayload {
  title: string;
  subtitle?: string;
  exportedAt?: string;
  sections: ExportSection[];
  summary?: ExportSummaryItem[];
  /** When set, preview and Excel use single-sheet recipe layout (header, yield, ingredients, instructions, prep time). */
  recipeSheet?: RecipeSheetBlock;
  /** When recipeSheet is set, optional labels for preview (Hebrew). */
  recipeSheetLabels?: RecipeSheetLabels;
}
