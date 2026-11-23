import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom, type Observable } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { LoggingService } from './logging.service'
import type { NewWaitlistInput, WaitlistEntry } from '@models/waitlist-entry.model'

const WAITLIST_URL = `${environment.apiUrl}${API.waitlist()}`

export type WaitlistList = { entries: WaitlistEntry[]; now: number }
export type WaitlistResult<T> = ({ ok: true } & T) | { ok: false; code: string | null }

/**
 * Plan 673: the client of the five waiting-list routes (`/api/v1/waitlist`). The list is a per-day read with the server's
 * clock, not a stored collection, so nothing is kept here; each call returns its result or the server's error code.
 */
@Injectable({ providedIn: 'root' })
export class WaitlistDataService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)

  list(date: string): Promise<WaitlistResult<WaitlistList>> {
    return this.run(
      'list',
      () => this.http.get<WaitlistList>(WAITLIST_URL, { params: { date } }),
      (r) => r
    )
  }

  add(input: NewWaitlistInput): Promise<WaitlistResult<{ entry: WaitlistEntry }>> {
    return this.run(
      'add',
      () => this.http.post<WaitlistEntry>(WAITLIST_URL, input),
      (entry) => ({ entry })
    )
  }

  notify(id: string): Promise<WaitlistResult<{ entry: WaitlistEntry; sent: boolean }>> {
    return this.run(
      'notify',
      () => this.http.put<WaitlistEntry & { sent?: boolean }>(`${WAITLIST_URL}/${id}/notify`, {}),
      ({ sent, ...entry }) => ({ entry: entry as WaitlistEntry, sent: sent === true })
    )
  }

  seat(id: string, tableKeys: string[]): Promise<WaitlistResult<{ entry: WaitlistEntry }>> {
    return this.run(
      'seat',
      () => this.http.put<WaitlistEntry>(`${WAITLIST_URL}/${id}/seat`, { tableKeys }),
      (entry) => ({ entry })
    )
  }

  left(id: string): Promise<WaitlistResult<{ entry: WaitlistEntry }>> {
    return this.run(
      'left',
      () => this.http.put<WaitlistEntry>(`${WAITLIST_URL}/${id}/left`, {}),
      (entry) => ({ entry })
    )
  }

  private async run<R, T>(name: string, call: () => Observable<R>, shape: (r: R) => T): Promise<WaitlistResult<T>> {
    try {
      return { ok: true, ...shape(await firstValueFrom(call())) }
    } catch (err) {
      const status = (err as { status?: number }).status
      const code = (err as { error?: { error?: string } }).error?.error ?? null
      const refused = status !== undefined && status >= 400 && status < 500
      this.logging[refused ? 'warn' : 'error']({
        event: `waitlist.${name}_${refused ? 'refused' : 'failed'}`,
        message: 'Waiting list call failed',
        context: { status: String(status ?? ''), code: code ?? '' }
      })
      return { ok: false, code }
    }
  }
}
