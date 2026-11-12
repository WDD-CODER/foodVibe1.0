import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import type { AiUsageParams, AiUsageReport } from '../models/ai-usage.model'

/** One line of the platform admin's table (plan 448): counts and dates only, never a business's content. */
export interface BusinessRow {
  _id: string
  name: string
  ownerName: string | null
  staffCount: number
  createdAt: number | null
  internal: boolean
  lastActivityAt: number | null
  activeDays7: number
  events: { total: number; active: number; closed: number; finished: number }
  /** closed / (closed + not closed), 0..1; null when there is nothing to divide. */
  closeRate: number | null
  lastEventDate: string | null
  /** Plan 556: the front desk checklist progress; null while the business has no profile. */
  frontDesk: { status: 'draft' | 'pilot' | 'active' | 'suspended'; done: number; total: number } | null
}

/** Plan 532: one business's own term (a logistics item) as the platform admin sees it. */
export interface AdminTermRow {
  id: string
  businessId: string
  businessName: string | null
  key: string
  phase: 'intake' | 'site_visit' | null
  section: string | null
  answerType: 'status' | 'quantity' | 'text' | null
  environments: string[] | null
  hint: string | null
  createdAt: number | null
}

/** Cross-business numbers for the platform admin. The server refuses everyone else. */
@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private readonly http = inject(HttpClient)

  private readonly _rows_ = signal<BusinessRow[]>([])
  public readonly rows_ = this._rows_.asReadonly()

  async load(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ rows: BusinessRow[] }>(`${environment.apiUrl}${API.admin('businesses')}`)
    )
    this._rows_.set(res.rows)
  }

  private readonly _termRows_ = signal<AdminTermRow[]>([])
  public readonly termRows_ = this._termRows_.asReadonly()

  /** Plan 532: every business's own terms of one kind (platform admin only). */
  async loadTerms(kind: 'logisticsItem'): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ rows: AdminTermRow[] }>(`${environment.apiUrl}${API.admin('taxonomy')}`, { params: { kind } })
    )
    this._termRows_.set(res.rows)
  }

  /** Plan 566: AI call totals for the platform admin, grouped by business, feature, model or day. */
  async getAiUsage(params: AiUsageParams = {}): Promise<AiUsageReport> {
    const query: Record<string, string> = {}
    for (const [key, value] of Object.entries(params)) if (value) query[key] = value
    return firstValueFrom(
      this.http.get<AiUsageReport>(`${environment.apiUrl}${API.admin('ai-usage')}`, { params: query })
    )
  }

  /** Plan 566: the same report as a CSV file (fetched with the session, then saved by the browser). */
  async downloadAiUsageCsv(params: AiUsageParams = {}): Promise<void> {
    const query: Record<string, string> = { format: 'csv' }
    for (const [key, value] of Object.entries(params)) if (value) query[key] = value
    const blob = await firstValueFrom(
      this.http.get(`${environment.apiUrl}${API.admin('ai-usage')}`, { params: query, responseType: 'blob' })
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ai-usage-${params.from ?? 'month'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  /** Optimistic: flips the row first, puts it back and rethrows when the server refuses. */
  async setInternal(id: string, internal: boolean): Promise<void> {
    const before = this._rows_()
    this._rows_.set(before.map((row) => (row._id === id ? { ...row, internal } : row)))
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}${API.admin(`businesses/${id}/internal`)}`, { internal })
      )
    } catch (err) {
      this._rows_.set(before)
      throw err
    }
  }
}
