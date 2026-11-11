import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom, Observable } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { BaseEntityDataService } from './base-entity-data.service'
import { BookingDataService } from './booking-data.service'
import { MenuEventDataService } from './menu-event-data.service'
import type { Booking } from '@models/booking.model'
import type { MenuEvent } from '@models/menu-event.model'
import type { DeclineReason, FrontDeskRequest, ManualRequestInput, RequestStatus } from '@models/request.model'

const REQUESTS_URL = `${environment.apiUrl}${API.requests}`

/** The stored request (already in the store), or the server's error code (null when there was none). */
export type RequestResult = { ok: true; request: FrontDeskRequest } | { ok: false; code: string | null }

/** An approved request with what it became: a `menuEvents` doc (kind event) or a booking (every other kind). */
export type ApproveResult =
  { ok: true; request: FrontDeskRequest; outcome: MenuEvent | Booking } | { ok: false; code: string | null }

/**
 * Plan 549: customer requests. Reads come through the generic API; every write goes to `API.requests`, which stamps
 * the actor and the status history. Error codes (BAD_STATUS, ALREADY_DECIDED, NO_PROFILE ...) are returned as codes.
 */
@Injectable({ providedIn: 'root' })
export class RequestDataService extends BaseEntityDataService<FrontDeskRequest> {
  private readonly http = inject(HttpClient)
  private readonly bookings = inject(BookingDataService)
  private readonly menuEvents = inject(MenuEventDataService)

  constructor() {
    super('requests', false, {
      errorEvent: 'crud.requests.hydrate_error',
      errorMessage: 'Failed to load the requests',
      clearOnReload: true
    })
  }

  /** Records a phone request; the server finds or creates the client and checks the rules. */
  createManual(input: ManualRequestInput): Promise<RequestResult> {
    return this.run('create', () => this.http.post<FrontDeskRequest>(REQUESTS_URL, input))
  }

  setStatus(id: string, status: RequestStatus, note?: string): Promise<RequestResult> {
    return this.run('status', () =>
      this.http.put<FrontDeskRequest>(`${REQUESTS_URL}/${id}/status`, note ? { status, note } : { status })
    )
  }

  updateWanted(
    id: string,
    wanted: FrontDeskRequest['wanted'],
    answers?: FrontDeskRequest['answers']
  ): Promise<RequestResult> {
    return this.run('wanted', () =>
      this.http.put<FrontDeskRequest>(`${REQUESTS_URL}/${id}/wanted`, answers ? { wanted, answers } : { wanted })
    )
  }

  /** Plan 550: approves in one call. The request, and what it became, are written into their stores. */
  async approve(id: string, wanted?: FrontDeskRequest['wanted'], note?: string): Promise<ApproveResult> {
    try {
      const body = { ...(wanted && { wanted }), ...(note && { note }) }
      const done = await firstValueFrom(
        this.http.post<{ request: FrontDeskRequest; outcome: MenuEvent | Booking }>(
          `${REQUESTS_URL}/${id}/approve`,
          body
        )
      )
      this.store(done.request)
      if (done.request.outcome?.type === 'booking') this.bookings.addServerCreated(done.outcome as Booking)
      else if (this.menuEvents.hasLoaded()) await this.menuEvents.reloadFromStorage()
      return { ok: true, request: done.request, outcome: done.outcome }
    } catch (err) {
      return this.refused('approve', err)
    }
  }

  /** Plan 550: declines with a reason (`text` is optional, at most 500 characters). */
  decline(id: string, reason: DeclineReason, text?: string): Promise<RequestResult> {
    return this.run('decline', () =>
      this.http.post<FrontDeskRequest>(`${REQUESTS_URL}/${id}/decline`, text ? { reason, text } : { reason })
    )
  }

  private store(saved: FrontDeskRequest): void {
    this.updateItems((items) =>
      items.some((r) => r._id === saved._id) ? items.map((r) => (r._id === saved._id ? saved : r)) : [...items, saved]
    )
  }

  private async run(name: string, call: () => Observable<FrontDeskRequest>): Promise<RequestResult> {
    try {
      const saved = await firstValueFrom(call())
      this.store(saved)
      return { ok: true, request: saved }
    } catch (err) {
      return this.refused(name, err)
    }
  }

  private refused(name: string, err: unknown): { ok: false; code: string | null } {
    const status = (err as { status?: number }).status
    const code = (err as { error?: { error?: string } }).error?.error ?? null
    const refused = status !== undefined && status >= 400 && status < 500
    this.logging[refused ? 'warn' : 'error']({
      event: `requests.${name}_${refused ? 'refused' : 'failed'}`,
      message: 'Request call failed',
      context: { status: String(status ?? ''), code: code ?? '' }
    })
    return { ok: false, code }
  }
}
