import { Injectable } from '@angular/core'
import { environment } from '../../../environments/environment'

export type LogContext = Record<string, unknown> | undefined

export interface LogEvent {
  event: string
  message: string
  context?: LogContext
  requestId?: string
}

type LogLevel = 'info' | 'warn' | 'error'

// Same sessionStorage key UserService.storeToken() writes. Read directly: the auth interceptor
// injects this service, so injecting UserService or HttpClient here would be a DI cycle.
const TOKEN_KEY = 'fv_token'
const LOG_PATH = '/api/v1/log'
const BACKOFF_MS = 60_000
const FLOOD_WINDOW_MS = 60_000
const FLOOD_MAX = 30
// Server limits (shared/schemas/entities/log-event.schema.ts) — trimmed here so an oversized
// event is shortened instead of rejected with 400 and lost.
const MESSAGE_MAX = 500
const CONTEXT_MAX_BYTES = 4096
const URL_MAX = 300

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private pausedUntil_ = 0
  private windowStart_ = 0
  private windowCount_ = 0
  private dropped_ = 0

  private sendToServer(level: LogLevel, event: LogEvent): void {
    // info is persisted only when the server opts in (LOG_PERSIST_INFO) — not worth the
    // network and rate-limit budget in production.
    if (level === 'info' && environment.production) return
    if (typeof fetch === 'undefined') return
    const now = Date.now()
    if (now < this.pausedUntil_) return
    if (!this.takeFloodSlot_(now)) return

    const payload = {
      level,
      event: event.event,
      message: event.message.slice(0, MESSAGE_MAX),
      ...(event.context ? { context: this.fitContext_(event.context) } : {}),
      ...(event.requestId ? { requestId: event.requestId } : {}),
      url: typeof location === 'undefined' ? undefined : location.pathname.slice(0, URL_MAX),
      timestamp: new Date(now).toISOString()
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = this.readToken_()
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Plain fetch on purpose: it bypasses the auth interceptor, so a failing log call can
    // never trigger a token refresh or sign-out.
    fetch(`${environment.apiUrl}${LOG_PATH}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true
    })
      .then((res) => {
        if (res.status === 429) this.pausedUntil_ = Date.now() + BACKOFF_MS
      })
      .catch(() => {
        this.pausedUntil_ = Date.now() + BACKOFF_MS
      })
  }

  /** Max FLOOD_MAX events per window; the first event of the next window reports the drops. */
  private takeFloodSlot_(now: number): boolean {
    if (now - this.windowStart_ >= FLOOD_WINDOW_MS) {
      const dropped = this.dropped_
      this.windowStart_ = now
      this.windowCount_ = 0
      this.dropped_ = 0
      if (dropped > 0) {
        this.sendToServer('warn', {
          event: 'log.client.dropped',
          message: `dropped ${dropped} log events over the client limit`,
          context: { dropped }
        })
      }
    }
    if (this.windowCount_ >= FLOOD_MAX) {
      this.dropped_++
      return false
    }
    this.windowCount_++
    return true
  }

  private fitContext_(context: Record<string, unknown>): Record<string, unknown> {
    let json: string
    try {
      json = JSON.stringify(context)
    } catch {
      return { unserializable: true }
    }
    if (new TextEncoder().encode(json).length <= CONTEXT_MAX_BYTES) return context
    // Leaves room for the wrapper; slicing by characters keeps multi-byte text under the cap.
    return { truncated: true, preview: json.slice(0, 1300) }
  }

  private readToken_(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  }

  info(message: string, context?: LogContext): void
  info(event: LogEvent): void
  info(messageOrEvent: string | LogEvent, context?: LogContext): void {
    const event =
      typeof messageOrEvent === 'string' ? { event: 'app.info', message: messageOrEvent, context } : messageOrEvent
    if (typeof window !== 'undefined' && window.console) {
      console.log(`[info] ${event.event}: ${event.message}`, event.context ?? '')
    }
    this.sendToServer('info', event)
  }

  warn(message: string, context?: LogContext): void
  warn(event: LogEvent): void
  warn(messageOrEvent: string | LogEvent, context?: LogContext): void {
    const event =
      typeof messageOrEvent === 'string' ? { event: 'app.warn', message: messageOrEvent, context } : messageOrEvent
    if (typeof window !== 'undefined' && window.console) {
      console.warn(`[warn] ${event.event}: ${event.message}`, event.context ?? '')
    }
    this.sendToServer('warn', event)
  }

  error(message: string, context?: LogContext): void
  error(event: LogEvent): void
  error(messageOrEvent: string | LogEvent, context?: LogContext): void {
    const event =
      typeof messageOrEvent === 'string' ? { event: 'app.error', message: messageOrEvent, context } : messageOrEvent
    if (typeof window !== 'undefined' && window.console) {
      console.error(`[error] ${event.event}: ${event.message}`, event.context ?? '')
    }
    this.sendToServer('error', event)
  }
}
