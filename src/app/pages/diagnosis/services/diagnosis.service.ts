import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type { Diagnosis } from '@schemas/entities'
import type { VolatilityRow } from '@schemas/diag/volatility'
import { API } from '@services/http-storage.adapter'
import { environment } from '../../../../environments/environment'

export type DiagnosisStatus = Diagnosis['status']
export type DiagMenuRow = Diagnosis['menu'][number]
export interface DiagnosisData {
  diagnosis: Diagnosis
  volatility: VolatilityRow[]
}
export interface MenuReadResult {
  items: { name: string; sellPrice: number | null }[]
  draftId: string
}
export interface SaveMenuBody {
  menu: DiagMenuRow[]
  draftId?: string
  pricesIncludeVat: boolean
  vatPct: number
}

const url = (path?: string): string => `${environment.apiUrl}${API.diag(path)}`

/**
 * Plan 634: the browser's client of the diagnosis routes (plan 633). `diagnoses` is written only by its router, so this
 * is a page-scoped HTTP client, not a generic data service. Every call throws the HttpErrorResponse on a refusal
 * the caller maps the code to a message.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosisService {
  private readonly http = inject(HttpClient)

  /** The business's diagnoses, newest first. */
  async list(): Promise<Diagnosis[]> {
    const rows = await firstValueFrom(this.http.get<Diagnosis[]>(`${environment.apiUrl}${API.data('diagnoses')}`))
    return [...rows].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }

  create(body: { name: string; periodDays: number }): Promise<Diagnosis> {
    return firstValueFrom(this.http.post<Diagnosis>(url(), body))
  }

  loadData(id: string): Promise<DiagnosisData> {
    return firstValueFrom(this.http.get<DiagnosisData>(url(`${id}/data`)))
  }

  saveMenu(id: string, body: SaveMenuBody): Promise<Diagnosis> {
    return firstValueFrom(this.http.put<Diagnosis>(url(`${id}/menu`), body))
  }

  saveInvoices(id: string, invoiceIds: string[]): Promise<Diagnosis> {
    return firstValueFrom(this.http.put<Diagnosis>(url(`${id}/invoices`), { invoiceIds }))
  }

  setStatus(id: string, status: DiagnosisStatus): Promise<Diagnosis> {
    return firstValueFrom(this.http.put<Diagnosis>(url(`${id}/status`), { status }))
  }

  readMenu(text: string): Promise<MenuReadResult> {
    return firstValueFrom(this.http.post<MenuReadResult>(`${environment.apiUrl}${API.ai('diag/menu')}`, { text }))
  }
}
