import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type { MonthPlan, MonthPlanUpdateInput } from '@schemas/entities'
import { API } from '@services/http-storage.adapter'
import { environment } from '../../../../environments/environment'

const url = (path?: string): string => `${environment.apiUrl}${API.monthPlans(path)}`

/**
 * Plan 727: the browser's client of the month plan routes. `monthPlans` is server-only (never the generic data API), so
 * this is a page-scoped HTTP client. Every call throws the HttpErrorResponse on a refusal; the caller maps the code.
 */
@Injectable({ providedIn: 'root' })
export class MonthPlanService {
  private readonly http = inject(HttpClient)

  /** The business's months, newest first. */
  async list(): Promise<MonthPlan[]> {
    const res = await firstValueFrom(this.http.get<{ months: MonthPlan[] }>(url()))
    return res.months
  }

  get(month: string): Promise<MonthPlan> {
    return firstValueFrom(this.http.get<MonthPlan>(url(month)))
  }

  /** Opens a month; `409 MONTH_EXISTS` when it is already there. */
  create(month: string): Promise<MonthPlan> {
    return firstValueFrom(this.http.post<MonthPlan>(url(), { month }))
  }

  /** Sends only the named fields; `null` clears an amount. */
  update(month: string, body: MonthPlanUpdateInput): Promise<MonthPlan> {
    return firstValueFrom(this.http.put<MonthPlan>(url(month), body))
  }
}
