import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { ProductDataService } from './product-data.service'

/** One product line of a supplier price list, as the server cleaned it (plan 432). */
export interface ImportRow {
  name: string
  baseUnit: string
  price: number | null
  purchaseUnit: string | null
  purchaseQty: number | null
  category: string | null
  needsReview: boolean
  duplicate: boolean
}

/** What the browser sends to save a row. */
export interface ApplyRow {
  name: string
  baseUnit: string
  price: number | null
  category: string | null
  purchaseUnit: string | null
  purchaseQty: number | null
}

/** The header the invoice read printed (C-INVREAD); a value that was not read is absent. */
export interface InvoiceHeader {
  supplierName?: string
  supplierTaxId?: string
  supplierPhone?: string
  invoiceNumber?: string
  invoiceDate?: string
  vatIncluded?: boolean
}

/** One line as printed on the invoice, before the rows were cleaned. */
export interface PrintedLine {
  name: string
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  lineTotal: number | null
}

/** The answer of POST /api/v1/ai/invoices/read (C-INVREAD). */
export interface InvoiceReadResult {
  header: InvoiceHeader
  supplier: { supplierId?: string; matchedBy?: 'taxId' | 'phone' | 'name'; supplierKey: string }
  rows: ImportRow[]
  printed: PrintedLine[]
  truncated: boolean
  draftId: string | null
  fileId: string | null
}

/** One memory match of POST /api/v1/product-import/resolve (C-ALIAS): row i is product productId. */
export interface ResolveMatch {
  i: number
  productId: string
  source: 'own' | 'shared'
}

/** The optional invoice header of the apply body (C-INVOICE). row = index into rows. */
export interface ApplyInvoice {
  supplierName: string
  supplierTaxId?: string
  invoiceNumber?: string
  invoiceDate?: string
  vatIncluded?: boolean
  source: 'photo' | 'pdf' | 'text'
  fileId?: string
  draftId?: string
  supplierKey?: string
  lines: {
    printedName: string
    quantity?: number
    unit?: string
    unitPrice?: number
    lineTotal?: number
    needsReview: boolean
    row: number
  }[]
}

export interface ApplyResult {
  created: number
  updated: number
  skipped: number
  invoiceId?: string | null
  skippedRows: { name: string; reason: 'same_price' | 'no_price' | 'invalid' | 'duplicate' }[]
}

/** One recent price rise of GET /api/v1/product-import/price-rises (C-INVOICE). */
export interface PriceRise {
  productId: string
  supplierId: string
  from: number
  to: number
  changePct: number
  at: number
}

/** Saves a whole price-list import in one server request (owner only, plan 432). */
@Injectable({ providedIn: 'root' })
export class ProductImportService {
  private readonly http_ = inject(HttpClient)
  private readonly productData_ = inject(ProductDataService)

  /** Memory first (plan 627): which rows of this supplier's invoice the business already linked. No model call. */
  async resolve(supplierKey: string, names: string[]): Promise<ResolveMatch[]> {
    const data = await firstValueFrom(
      this.http_.post<{ matches: ResolveMatch[] }>(`${environment.authApiUrl}${API.productImport('resolve')}`, {
        supplierKey,
        names
      })
    )
    return data.matches
  }

  /** The latest rise per product and supplier at or above the business's alert percent, within days (owner only). */
  getPriceRises(days = 60): Promise<PriceRise[]> {
    return firstValueFrom(
      this.http_.get<PriceRise[]>(`${environment.authApiUrl}${API.productImport('price-rises')}`, { params: { days } })
    )
  }

  async apply(supplierId: string | null, rows: ApplyRow[], invoice?: ApplyInvoice): Promise<ApplyResult> {
    const body = invoice ? { supplierId, rows, invoice } : { supplierId, rows }
    const result = await firstValueFrom(
      this.http_.post<ApplyResult>(`${environment.authApiUrl}${API.productImport('apply')}`, body)
    )
    await this.productData_.reloadFromStorage()
    return result
  }
}
