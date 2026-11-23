import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom, type Observable } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { LoggingService } from './logging.service'
import type { Conversation, ConversationRow, Message } from '@models/conversation.model'

const conversationsUrl = () => `${environment.apiUrl}${API.conversations}`
const aiFrontdeskUrl = () => `${environment.apiUrl}${API.ai('frontdesk')}`

export type ConversationResult = { ok: true } | { ok: false; code: string | null }
export type Thread = { conversation: Conversation; messages: Message[] }

/**
 * Plan 677: the client of the conversations routes (`/api/v1/conversations`, plan 687). The list is a polled read with
 * the server's clock, not a stored collection, so it does not extend `BaseEntityDataService`. Logs carry an event, a
 * status and a code — never a name, a phone or message text.
 */
@Injectable({ providedIn: 'root' })
export class ConversationDataService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)

  private readonly conversationsSig = signal<ConversationRow[]>([])
  private readonly nowSig = signal(0)
  private readonly listFailedSig = signal(false)
  private readonly listLoadedSig = signal(false)
  private readonly threadSig = signal<Thread | null>(null)
  private readonly threadNowSig = signal(0)
  private readonly threadFailedSig = signal<'not_found' | 'failed' | null>(null)

  readonly conversations_ = this.conversationsSig.asReadonly()
  readonly now_ = this.nowSig.asReadonly()
  readonly listFailed_ = this.listFailedSig.asReadonly()
  /** True once a list read has answered (so the first load can show the loader). */
  readonly listLoaded_ = this.listLoadedSig.asReadonly()
  readonly thread_ = this.threadSig.asReadonly()
  /** The server's time at the last thread read. */
  readonly threadNow_ = this.threadNowSig.asReadonly()
  readonly threadFailed_ = this.threadFailedSig.asReadonly()

  async list(opts: { test?: boolean } = {}): Promise<void> {
    try {
      const params: Record<string, string> = opts.test ? { test: '1' } : {}
      const res = await firstValueFrom(
        this.http.get<{ conversations: ConversationRow[]; now: number }>(conversationsUrl(), { params })
      )
      this.conversationsSig.set(res.conversations ?? [])
      this.nowSig.set(res.now ?? Date.now())
      this.listFailedSig.set(false)
    } catch (err) {
      this.listFailedSig.set(true)
      this.logFailure('list', err)
    } finally {
      this.listLoadedSig.set(true)
    }
  }

  /** `peek` reads the thread without clearing the business's unread number (the simulator reads as the guest). */
  async open(id: string, opts: { peek?: boolean } = {}): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ conversation: Conversation; messages: Message[]; now: number }>(
          `${conversationsUrl()}/${encodeURIComponent(id)}/messages`,
          opts.peek ? { params: { peek: '1' } } : {}
        )
      )
      this.threadSig.set({ conversation: res.conversation, messages: res.messages ?? [] })
      this.threadNowSig.set(res.now ?? Date.now())
      this.threadFailedSig.set(null)
      if (!opts.peek) this.patchRow(id, { unread: 0 })
    } catch (err) {
      const status = (err as { status?: number }).status
      // A failed re-read of the thread that is already open keeps what is shown.
      if (this.threadSig()?.conversation._id !== id || status === 404) {
        this.threadSig.set(null)
        this.threadFailedSig.set(status === 404 ? 'not_found' : 'failed')
      }
      this.logFailure('open', err)
    }
  }

  closeThread(): void {
    this.threadSig.set(null)
    this.threadFailedSig.set(null)
  }

  reply(id: string, text: string): Promise<ConversationResult> {
    return this.send(id, { text })
  }

  sendTemplate(id: string, name: string, values: Record<string, string>): Promise<ConversationResult> {
    return this.send(id, { template: { name, values } })
  }

  /** Plan 682: asks the assistant for a fresh draft reply; the held conversation gets the new `suggestion`. */
  async suggest(id: string): Promise<{ ok: true; suggestion: string } | { ok: false }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ suggestion: string }>(`${aiFrontdeskUrl()}/suggest`, { conversationId: id })
      )
      const suggestion = res.suggestion ?? ''
      this.threadSig.update((t) =>
        t && t.conversation._id === id ? { ...t, conversation: { ...t.conversation, suggestion } } : t
      )
      this.patchRow(id, { suggestion })
      return { ok: true, suggestion }
    } catch (err) {
      this.logFailure('suggest', err)
      return { ok: false }
    }
  }

  /** Plan 682: turns a wrong assistant message and the right answer into a draft knowledge item. */
  async fixAnswer(
    conversationId: string,
    messageId: string,
    answer: string,
    issue: string
  ): Promise<{ ok: true; drafted: boolean } | { ok: false; code?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ drafted: boolean }>(`${aiFrontdeskUrl()}/fix`, { conversationId, messageId, answer, issue })
      )
      return { ok: true, drafted: res.drafted === true }
    } catch (err) {
      this.logFailure('fix', err)
      const code = (err as { error?: { error?: string } }).error?.error
      return code ? { ok: false, code } : { ok: false }
    }
  }

  takeOver(id: string): Promise<ConversationResult> {
    return this.move(id, 'takeover')
  }

  handBack(id: string): Promise<ConversationResult> {
    return this.move(id, 'release')
  }

  async close(id: string): Promise<ConversationResult> {
    const res = await this.move(id, 'close')
    if (res.ok) {
      this.conversationsSig.update((rows) => rows.filter((r) => r._id !== id))
      if (this.threadSig()?.conversation._id === id) this.threadSig.set(null)
    }
    return res
  }

  private send(id: string, body: object): Promise<ConversationResult> {
    return this.run(
      'send',
      () =>
        this.http.post<{ message: Message; conversation: Conversation }>(
          `${conversationsUrl()}/${encodeURIComponent(id)}/messages`,
          body
        ),
      (res) => {
        this.threadSig.update((t) =>
          t && t.conversation._id === id
            ? { conversation: res.conversation, messages: [...t.messages, res.message] }
            : t
        )
        this.patchRow(id, res.conversation)
      }
    )
  }

  private move(id: string, action: 'takeover' | 'release' | 'close'): Promise<ConversationResult> {
    return this.run(
      action,
      () => this.http.put<Conversation>(`${conversationsUrl()}/${encodeURIComponent(id)}/${action}`, {}),
      (conversation) => {
        this.threadSig.update((t) => (t && t.conversation._id === id ? { ...t, conversation } : t))
        this.patchRow(id, conversation)
      }
    )
  }

  private patchRow(id: string, patch: Partial<Conversation>): void {
    this.conversationsSig.update((rows) => rows.map((r) => (r._id === id ? { ...r, ...patch } : r)))
  }

  private async run<R>(name: string, call: () => Observable<R>, apply: (r: R) => void): Promise<ConversationResult> {
    try {
      apply(await firstValueFrom(call()))
      return { ok: true }
    } catch (err) {
      this.logFailure(name, err)
      return { ok: false, code: (err as { error?: { error?: string } }).error?.error ?? null }
    }
  }

  private logFailure(name: string, err: unknown): void {
    const status = (err as { status?: number }).status
    const code = (err as { error?: { error?: string } }).error?.error ?? ''
    const refused = status !== undefined && status >= 400 && status < 500
    this.logging[refused ? 'warn' : 'error']({
      event: `conversations.${name}_${refused ? 'refused' : 'failed'}`,
      message: 'Conversations call failed',
      context: { status: String(status ?? ''), code }
    })
  }
}
