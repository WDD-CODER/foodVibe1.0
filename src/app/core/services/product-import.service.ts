import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
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

export interface ApplyResult {
  created: number
  updated: number
  skipped: number
  skippedRows: { name: string; reason: 'same_price' | 'no_price' | 'invalid' | 'duplicate' }[]
}

/** Saves a whole price-list import in one server request (owner only, plan 432). */
@Injectable({ providedIn: 'root' })
export class ProductImportService {
  private readonly http_ = inject(HttpClient)
  private readonly productData_ = inject(ProductDataService)

  async apply(supplierId: string | null, rows: ApplyRow[]): Promise<ApplyResult> {
    const result = await firstValueFrom(
      this.http_.post<ApplyResult>(`${environment.authApiUrl}/api/v1/product-import/apply`, { supplierId, rows })
    )
    await this.productData_.reloadFromStorage()
    return result
  }
}
