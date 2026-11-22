import type { ApplyInvoice, InvoiceReadResult } from '@services/product-import.service'
import { formatPct1 } from 'src/app/core/engine/rounding'
import { buildInvoiceLines, type KeptRow } from '@utils/invoice-lines.util'

/** `matching`: the AI step has not settled this row yet, so neither `new` nor an existing status is claimed. */
export type ImportRowStatus = 'new' | 'update' | 'same' | 'matching'

/** One editable line of the preview. `id` keeps the row stable while its siblings are deleted. */
export interface PreviewRow {
  id: number
  name: string
  /** The name as the file printed it; an edit of `name` never changes it (plan 628). */
  printedName: string
  baseUnit: string
  price: number | null
  purchaseUnit: string
  purchaseQty: number | null
  category: string
  needsReview: boolean
  duplicate: boolean
  /** The product the AI step linked this row to; dropped as soon as the name is edited. */
  matchedId: string | null
  /** Plan 641: the owner's pick for a row compared with another supplier's price; null = the default. */
  supplierChoice: 'update' | 'add' | null
}

export interface ImportSummary {
  created: number
  updated: number
  skipped: number
}

/** What a file read told us about the invoice (plan 628); the import screen holds null after a pasted list. */
export interface InvoiceState {
  source: 'photo' | 'pdf'
  header: InvoiceReadResult['header']
  supplierKey: string
  draftId: string | null
  fileId: string | null
  printed: InvoiceReadResult['printed']
  /** The supplier id the read recognised ('' when none or not in the supplier list). */
  suggestedSupplierId: string
}

export function isIsoDate(value: string | undefined): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function invoiceStateFrom(read: InvoiceReadResult, file: File, isSupplierKnown: boolean): InvoiceState {
  return {
    source: file.type === 'application/pdf' ? 'pdf' : 'photo',
    header: read.header ?? {},
    supplierKey: read.supplier.supplierKey,
    suggestedSupplierId: isSupplierKnown ? (read.supplier.supplierId ?? '') : '',
    draftId: read.draftId,
    fileId: read.fileId,
    printed: read.printed ?? []
  }
}

/** The `invoice` header of the apply body: empty values are left out, one line per kept row. */
export function buildApplyInvoice(
  state: InvoiceState,
  supplierName: string,
  invoiceNumber: string,
  invoiceDate: string,
  keptRows: KeptRow[]
): ApplyInvoice {
  const number = invoiceNumber.trim()
  const { header } = state
  return {
    supplierName,
    ...(header.supplierTaxId ? { supplierTaxId: header.supplierTaxId } : {}),
    ...(number ? { invoiceNumber: number } : {}),
    ...(invoiceDate ? { invoiceDate } : {}),
    ...(typeof header.vatIncluded === 'boolean' ? { vatIncluded: header.vatIncluded } : {}),
    source: state.source,
    ...(state.fileId ? { fileId: state.fileId } : {}),
    ...(state.draftId ? { draftId: state.draftId } : {}),
    supplierKey: state.supplierKey,
    lines: buildInvoiceLines(keptRows, state.printed)
  }
}

/** The message key for a failed read: a pasted list or a file. */
export function importErrorKey(fromFile: boolean, status: number, code: string, reason: string): string {
  if (code === 'ai_monthly_cap_reached') return 'ai_monthly_cap_reached'
  if (status === 429 || code.includes('daily_limit_reached')) return 'ai_daily_limit_reached_all'
  if (!fromFile) return 'import_ai_failed'
  if (reason === 'FILE_TOO_LARGE' || code === 'FILE_TOO_LARGE' || status === 413) return 'import_file_too_big'
  if (reason === 'FILE_TYPE_UNSUPPORTED' || code === 'UNSUPPORTED_FILE_TYPE') return 'import_file_unsupported'
  return 'import_file_failed'
}

/** `+6.0%` / `-4.0%`. */
export function changeText(pct: number): string {
  return `${pct > 0 ? '+' : ''}${formatPct1(pct)}`
}

/** A typed price or quantity as a number above 0 (a comma counts as the decimal point), else null. */
export function positiveNumber(value: string | number | null): number | null {
  const n =
    typeof value === 'number'
      ? value
      : Number(
          String(value ?? '')
            .trim()
            .replace(',', '.')
        )
  return Number.isFinite(n) && n > 0 ? n : null
}
