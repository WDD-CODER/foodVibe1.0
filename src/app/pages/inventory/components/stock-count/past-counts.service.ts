import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../../../environments/environment'
import { API } from '@services/http-storage.adapter'
import type { StockCount } from '@schemas/entities/stock-count.schema'

/**
 * Plan 651: the past-counts list (drafts and finished counts, newest first) from `GET /api/v1/stock/counts`.
 * It lives beside the count page: `stock-count.service.ts` is outside this plan's scope.
 */
@Injectable({ providedIn: 'root' })
export class PastCountsService {
  private readonly http_ = inject(HttpClient)

  list(): Promise<StockCount[]> {
    const params = new HttpParams().set('status', 'all').set('limit', '50')
    return firstValueFrom(this.http_.get<StockCount[]>(`${environment.apiUrl}${API.stock('counts')}`, { params }))
  }
}
