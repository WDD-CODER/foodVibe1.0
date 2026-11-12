import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type { BusinessStats, StatsPeriod } from '@models/business-stats.model'
import type { FrontDeskStats } from '@models/frontdesk-stats.model'
import type { BusinessReport, ReportMonths } from '@models/business-report.model'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'

/** The dashboard's numbers (plan 447). Every figure is computed by the server for the caller's business. */
@Injectable({ providedIn: 'root' })
export class BusinessStatsService {
  private readonly http = inject(HttpClient)

  get(period: StatsPeriod): Promise<BusinessStats> {
    return firstValueFrom(
      this.http.get<BusinessStats>(`${environment.apiUrl}${API.stats('business')}`, { params: { period } })
    )
  }

  /** Plan 568: the business report. `businessId` is for the platform admin only. */
  getReport(months: ReportMonths, businessId?: string): Promise<BusinessReport> {
    const params: Record<string, string> = { months: String(months) }
    if (businessId) params['businessId'] = businessId
    return firstValueFrom(this.http.get<BusinessReport>(`${environment.apiUrl}${API.stats('report')}`, { params }))
  }

  /** Plan 559: the front desk numbers over [from, to] (Israel dates; default the last 7 days). `businessId` is for the platform admin only. */
  getFrontDesk(range: { from?: string; to?: string } = {}, businessId?: string): Promise<FrontDeskStats> {
    const params: Record<string, string> = {}
    if (range.from) params['from'] = range.from
    if (range.to) params['to'] = range.to
    if (businessId) params['businessId'] = businessId
    return firstValueFrom(this.http.get<FrontDeskStats>(`${environment.apiUrl}${API.stats('frontdesk')}`, { params }))
  }
}
