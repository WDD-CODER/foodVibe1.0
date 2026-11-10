import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom, Observable } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { BaseEntityDataService } from './base-entity-data.service'
import type { FrontDeskRequest, ManualRequestInput, RequestStatus } from '@models/request.model'

const REQUESTS_URL = `${environment.apiUrl}${API.requests}`

/** The stored request (already in the store), or the server's error code (null when there was none). */
export type RequestResult = { ok: true; request: FrontDeskRequest } | { ok: false; code: string | null }

/**
 * Plan 549: customer requests. Reads come through the generic API; every write goes to `API.requests`, which stamps
 * the actor and the status history. Error codes (BAD_STATUS, ALREADY_DECIDED, NO_PROFILE ...) are returned as codes.
 */
@Injectable({ providedIn: 'root' })
export class RequestDataService extends BaseEntityDataService<FrontDeskRequest> {
  private readonly http = inject(HttpClient)

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

  private async run(name: string, call: () => Observable<FrontDeskRequest>): Promise<RequestResult> {
    try {
      const saved = await firstValueFrom(call())
      this.updateItems((items) =>
        items.some((r) => r._id === saved._id) ? items.map((r) => (r._id === saved._id ? saved : r)) : [...items, saved]
      )
      return { ok: true, request: saved }
    } catch (err) {
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
}
