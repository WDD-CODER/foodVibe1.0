import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { API } from '@services/http-storage.adapter'
import type { PublicRequestInput } from '@schemas/public/public-request.schema'
import type { OperatingHoursRow } from '@schemas/entities'
import type { FrontDeskQuestion, FrontDeskRequestKind } from '@schemas/entities'

/** Plan 555 (C-PUBLIC): what the server shows a stranger about a business. */
export interface PublicKindView {
  kind: FrontDeskRequestKind
  questions: FrontDeskQuestion[]
  rules: { minPartySize?: number; maxPartySize?: number; minLeadHours?: number; maxLeadDays?: number }
  durationMinutes?: number
}
export interface PublicProfileView {
  available: true
  displayName: string
  logoUrl?: string
  phone?: string
  address?: string
  serviceArea?: string
  hours: OperatingHoursRow[]
  closedDates?: string[]
  kinds: PublicKindView[]
}
export type PublicProfileResult =
  | { state: 'ready'; profile: PublicProfileView }
  | { state: 'unavailable'; displayName: string }
  | { state: 'not_found' }
  | { state: 'failed' }

export interface PublicRequestStatus {
  reference: string
  kind: FrontDeskRequestKind
  status: 'new' | 'qualified' | 'needs_info' | 'approved' | 'declined' | 'cancelled' | 'expired'
  wanted: { date?: string; time?: string; partySize?: number }
  guestName: string
  createdAt: number
  displayName: string
  phone?: string
  booking?: { date: string; time: string; partySize: number; status: string }
  eventOpened?: boolean
  declineReason?: 'full' | 'date_taken' | 'out_of_area' | 'below_minimum'
}
export type StatusResult = { ok: true; status: PublicRequestStatus } | { ok: false; code: string }
export type SendResult =
  | { ok: true; reference: string; token: string }
  | { ok: false; code: string; issues: { path: string; code: string; message: string }[] }

/**
 * Plan 555: the page-scoped client of `/api/v1/public`. No member token matters here: the server ignores it.
 * Errors come back as codes; nothing here logs the token.
 */
@Injectable()
export class PublicRequestService {
  private readonly http = inject(HttpClient)
  private readonly base = environment.apiUrl

  private url(path: string): string {
    return `${this.base}${API.public(path)}`
  }

  async loadProfile(slug: string): Promise<PublicProfileResult> {
    try {
      const body = await firstValueFrom(
        this.http.get<PublicProfileView | { available: false; displayName: string }>(this.url(encodeURIComponent(slug)))
      )
      return body.available
        ? { state: 'ready', profile: body }
        : { state: 'unavailable', displayName: body.displayName }
    } catch (err) {
      return err instanceof HttpErrorResponse && err.status === 404 ? { state: 'not_found' } : { state: 'failed' }
    }
  }

  async send(slug: string, input: PublicRequestInput): Promise<SendResult> {
    try {
      const body = await firstValueFrom(
        this.http.post<{ reference: string; token: string }>(this.url(`${encodeURIComponent(slug)}/requests`), input)
      )
      return { ok: true, reference: body.reference, token: body.token }
    } catch (err) {
      const http = err instanceof HttpErrorResponse ? err : null
      const body = (http?.error ?? {}) as { error?: string; issues?: { path: string; code: string; message: string }[] }
      const code = http?.status === 429 ? 'TOO_MANY' : (body.error ?? 'FAILED')
      return { ok: false, code, issues: Array.isArray(body.issues) ? body.issues : [] }
    }
  }

  getStatus(slug: string, token: string): Promise<StatusResult> {
    return this.statusCall(() =>
      this.http.get<PublicRequestStatus>(this.url(`${encodeURIComponent(slug)}/requests/${encodeURIComponent(token)}`))
    )
  }

  cancel(slug: string, token: string): Promise<StatusResult> {
    return this.statusCall(() =>
      this.http.post<PublicRequestStatus>(
        this.url(`${encodeURIComponent(slug)}/requests/${encodeURIComponent(token)}/cancel`),
        {}
      )
    )
  }

  private async statusCall(
    call: () => ReturnType<HttpClient['get']> | import('rxjs').Observable<PublicRequestStatus>
  ): Promise<StatusResult> {
    try {
      return { ok: true, status: await firstValueFrom(call() as import('rxjs').Observable<PublicRequestStatus>) }
    } catch (err) {
      const http = err instanceof HttpErrorResponse ? err : null
      const body = (http?.error ?? {}) as { error?: string }
      return { ok: false, code: http?.status === 404 ? 'NOT_FOUND' : (body.error ?? 'FAILED') }
    }
  }
}
