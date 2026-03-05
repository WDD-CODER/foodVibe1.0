import { Injectable } from '@angular/core'
import { environment } from '../../../environments/environment'

export type LogContext = Record<string, unknown> | undefined

export interface LogEvent {
  event: string
  message: string
  context?: LogContext
}

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private sendToLogServer(level: string, event: LogEvent): void {
    const url = (environment as { logServerUrl?: string }).logServerUrl
    if (!url || typeof fetch === 'undefined') return
    const payload = {
      level,
      event: event.event,
      message: event.message,
      context: event.context,
      timestamp: new Date().toISOString()
    }
    fetch(`${url.replace(/\/$/, '')}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => { /* fire-and-forget; ignore if server not running */ })
  }

  info(message: string, context?: LogContext): void
  info(event: LogEvent): void
  info(messageOrEvent: string | LogEvent, context?: LogContext): void {
    const event = typeof messageOrEvent === 'string'
      ? { event: 'app.info', message: messageOrEvent, context }
      : messageOrEvent
    if (typeof window !== 'undefined' && window.console) {
      console.log(`[info] ${event.event}: ${event.message}`, event.context ?? '')
    }
    this.sendToLogServer('info', event)
  }

  warn(message: string, context?: LogContext): void
  warn(event: LogEvent): void
  warn(messageOrEvent: string | LogEvent, context?: LogContext): void {
    const event = typeof messageOrEvent === 'string'
      ? { event: 'app.warn', message: messageOrEvent, context }
      : messageOrEvent
    if (typeof window !== 'undefined' && window.console) {
      console.warn(`[warn] ${event.event}: ${event.message}`, event.context ?? '')
    }
    this.sendToLogServer('warn', event)
  }

  error(message: string, context?: LogContext): void
  error(event: LogEvent): void
  error(messageOrEvent: string | LogEvent, context?: LogContext): void {
    const event = typeof messageOrEvent === 'string'
      ? { event: 'app.error', message: messageOrEvent, context }
      : messageOrEvent
    if (typeof window !== 'undefined' && window.console) {
      console.error(`[error] ${event.event}: ${event.message}`, event.context ?? '')
    }
    this.sendToLogServer('error', event)
  }
}
