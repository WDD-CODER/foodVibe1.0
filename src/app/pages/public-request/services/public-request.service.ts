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
  tableBooking?: { areas: { key: string; name: string }[] }
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
  booking?: {
    date: string
    time: string
    partySize: number
    status: string
    guestConfirmed?: boolean
    canCancel?: boolean
  }
  eventOpened?: boolean
  declineReason?: 'full' | 'date_taken' | 'out_of_area' | 'below_minimum'
}
export type StatusResult = { ok: true; status: PublicRequestStatus } | { ok: false; code: string }
export type SendResult =
  | {
      ok: true
      reference: string
      token: string
      confirmed?: boolean
      booking?: { date: string; time: string; partySize: number }
    }
  | {
      ok: false
      code: string
      issues: { path: string; code: string; message: string }[]
      alternatives?: { date: string; time: string }[]
    }
export type AvailabilityResult =
  | { ok: true; slots: { time: string; available: boolean }[]; next?: { date: string; time: string } }
  | { ok: false; code: 'TOO_MANY' | 'FAILED' }

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
        this.http.post<{
          reference: string
          token: string
          confirmed?: boolean
          booking?: { date: string; time: string; partySize: number }
        }>(this.url(`${encodeURIComponent(slug)}/requests`), input)
      )
      return {
        ok: true,
        reference: body.reference,
        token: body.token,
        ...(body.confirmed !== undefined && { confirmed: body.confirmed }),
        ...(body.booking && { booking: body.booking })
      }
    } catch (err) {
      const http = err instanceof HttpErrorResponse ? err : null
      const body = (http?.error ?? {}) as {
        error?: string
        issues?: { path: string; code: string; message: string }[]
        alternatives?: { date: string; time: string }[]
      }
      const code = http?.status === 429 ? 'TOO_MANY' : (body.error ?? 'FAILED')
      return {
        ok: false,
        code,
        issues: Array.isArray(body.issues) ? body.issues : [],
        ...(code === 'NO_TABLE' && { alternatives: Array.isArray(body.alternatives) ? body.alternatives : [] })
      }
    }
  }

  /** Plan 670: the free hours of a day (no token; its own limiter, 429 → TOO_MANY). */
  async availability(slug: string, date: string, partySize: number, area?: string): Promise<AvailabilityResult> {
    try {
      const params: Record<string, string> = { date, partySize: String(partySize), ...(area && { area }) }
      const body = await firstValueFrom(
        this.http.get<{ slots: { time: string; available: boolean }[]; next?: { date: string; time: string } }>(
          this.url(`${encodeURIComponent(slug)}/availability`),
          { params }
        )
      )
      return { ok: true, slots: Array.isArray(body.slots) ? body.slots : [], ...(body.next && { next: body.next }) }
    } catch (err) {
      return { ok: false, code: err instanceof HttpErrorResponse && err.status === 429 ? 'TOO_MANY' : 'FAILED' }
    }
  }

  /** Plan 670: the guest says "we are coming". */
  confirm(slug: string, token: string): Promise<StatusResult> {
    return this.statusCall(() =>
      this.http.post<PublicRequestStatus>(
        this.url(`${encodeURIComponent(slug)}/requests/${encodeURIComponent(token)}/confirm`),
        {}
      )
    )
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
