import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom, type Observable } from 'rxjs'
import { environment } from '../../../../../environments/environment'
import { API } from '@services/http-storage.adapter'
import { LoggingService } from '@services/logging.service'

export type SimJob = 'reminder' | 'late'
export type SimFailure = { ok: false; code: string | null }
export type SimSendResult = { ok: true; conversationId: string } | SimFailure
export type SimJobResult = { ok: true; job: SimJob; done: boolean; reason?: string } | SimFailure
export type SimClearResult = { ok: true } | SimFailure

/**
 * Plan 678: the browser's one client of the simulator routes (`/api/v1/sim`, plans 675/676). The owner writes as a test
 * guest; the server runs the same inbound path a real message uses. Logs carry an event, a status and a code — never a
 * phone, a name or message text.
 */
@Injectable({ providedIn: 'root' })
export class SimulatorService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)

  private url(path: string): string {
    return `${environment.apiUrl}${API.sim(path)}`
  }

  send(phone: string, name: string | undefined, text: string): Promise<SimSendResult> {
    const body = name ? { phone, name, text } : { phone, text }
    return this.run(
      'send',
      () => this.http.post<{ conversationId: string }>(this.url('inbound'), body),
      (r) => ({ ok: true, conversationId: r.conversationId })
    )
  }

  tap(phone: string, buttonId: string): Promise<SimSendResult> {
    return this.run(
      'tap',
      () => this.http.post<{ conversationId: string }>(this.url('inbound'), { phone, buttonId }),
      (r) => ({ ok: true, conversationId: r.conversationId })
    )
  }

  runJob(conversationId: string, job: SimJob): Promise<SimJobResult> {
    return this.run(
      'clock',
      () => this.http.post<{ job: SimJob; done: boolean; reason?: string }>(this.url('clock'), { conversationId, job }),
      (r) => ({ ok: true, job: r.job, done: r.done === true, reason: r.reason })
    )
  }

  clearTestData(): Promise<SimClearResult> {
    return this.run(
      'clear',
      () => this.http.delete<unknown>(this.url('test-data')),
      () => ({ ok: true })
    )
  }

  private async run<R, T>(name: string, call: () => Observable<R>, ok: (r: R) => T): Promise<T | SimFailure> {
    try {
      return ok(await firstValueFrom(call()))
    } catch (err) {
      const status = (err as { status?: number }).status
      const code = (err as { error?: { error?: string } }).error?.error ?? null
      const refused = status !== undefined && status >= 400 && status < 500
      this.logging[refused ? 'warn' : 'error']({
        event: `sim.${name}_${refused ? 'refused' : 'failed'}`,
        message: 'Simulator call failed',
        context: { status: String(status ?? ''), code: code ?? '' }
      })
      return { ok: false, code }
    }
  }
}
