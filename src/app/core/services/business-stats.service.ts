import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type { BusinessStats, StatsPeriod } from '@models/business-stats.model'
import { environment } from '../../../environments/environment'

/** The dashboard's numbers (plan 447). Every figure is computed by the server for the caller's business. */
@Injectable({ providedIn: 'root' })
export class BusinessStatsService {
  private readonly http = inject(HttpClient)

  get(period: StatsPeriod): Promise<BusinessStats> {
    return firstValueFrom(
      this.http.get<BusinessStats>(`${environment.apiUrl}/api/v1/stats/business`, { params: { period } })
    )
  }
}
