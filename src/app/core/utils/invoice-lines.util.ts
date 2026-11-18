import type { ApplyInvoice, PrintedLine } from '../services/product-import.service'
import { normalizeProductName } from './product-name.util'

export type InvoiceLine = ApplyInvoice['lines'][number]

/** A kept preview row as the lines need it: the name it had when it was read, and its flag. */
export interface KeptRow {
  printedName: string
  needsReview: boolean
}

const positive = (n: number | null | undefined): number | undefined =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined

/**
 * Plan 628: one invoice line per kept preview row, in row order. `row` is the row's index in the `rows` array of the
 * same apply request. The printed values come from the printed entry with the same normalised name (the last one
 * wins — the server merges duplicate names the same way); a value that is not a number above 0 is left out.
 */
export function buildInvoiceLines(keptRows: KeptRow[], printed: PrintedLine[]): InvoiceLine[] {
  const byName = new Map<string, PrintedLine>()
  for (const p of printed) byName.set(normalizeProductName(p.name), p)
  return keptRows.map((row, index) => {
    const line: InvoiceLine = { printedName: row.printedName, needsReview: row.needsReview, row: index }
    const p = byName.get(normalizeProductName(row.printedName))
    if (!p) return line
    const quantity = positive(p.quantity)
    const unitPrice = positive(p.unitPrice)
    const lineTotal = positive(p.lineTotal)
    if (quantity !== undefined) line.quantity = quantity
    if (typeof p.unit === 'string' && p.unit.trim() !== '') line.unit = p.unit
    if (unitPrice !== undefined) line.unitPrice = unitPrice
    if (lineTotal !== undefined) line.lineTotal = lineTotal
    return line
  })
}
