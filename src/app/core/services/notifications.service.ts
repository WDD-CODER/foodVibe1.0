import { computed, inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type { Notification } from '@schemas/entities'
import { environment } from '../../../environments/environment'
import { LoggingService } from './logging.service'

/** One alert as the list shows it: the stored alert plus the business name (plan 646). */
export type AlertRow = Notification & { businessName: string }

const POLL_MS = 60_000
const URL = () => `${environment.apiUrl}/api/v1/notifications`

/**
 * Plan 646: the signed-in user's in-app alerts. Reads `GET /notifications` and polls every 60 s while the tab is
 * visible (a hidden tab does not ask). `markRead` and `markAllRead` update the list at once and tell the server.
 * The browser writes no alert: the server creates them inside the invoice apply.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)

  private readonly _rows_ = signal<AlertRow[]>([])
  readonly rows_ = this._rows_.asReadonly()
  readonly unread_ = computed(() => this._rows_().filter((row) => row.readAt === undefined).length)

  private timer: ReturnType<typeof setInterval> | null = null
  private onVisible: (() => void) | null = null

  /** Reads the list now; a failure keeps what is shown and logs once. */
  async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ rows: AlertRow[]; unread: number }>(`${URL()}?limit=50`))
      this._rows_.set(res.rows)
    } catch (err) {
      this.logging.warn({
        event: 'notifications.load_failed',
        message: 'Alerts could not be loaded',
        context: { status: String((err as { status?: number }).status) }
      })
    }
  }

  /** Starts the 60 s poll (once) and reads now. Nothing is asked while the tab is hidden. */
  startPolling(): void {
    if (this.timer !== null) return
    void this.load()
    this.timer = setInterval(() => {
      if (!this.isHidden()) void this.load()
    }, POLL_MS)
    if (typeof document !== 'undefined') {
      this.onVisible = () => {
        if (!this.isHidden()) void this.load()
      }
      document.addEventListener('visibilitychange', this.onVisible)
    }
  }

  stopPolling(): void {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    if (this.onVisible && typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.onVisible)
    this.onVisible = null
  }

  async markRead(id: string): Promise<void> {
    const now = Date.now()
    this._rows_.update((rows) =>
      rows.map((row) => (row._id === id && row.readAt === undefined ? { ...row, readAt: now } : row))
    )
    try {
      await firstValueFrom(this.http.post(`${URL()}/${encodeURIComponent(id)}/read`, {}))
    } catch (err) {
      this.warnWrite(err)
    }
  }

  async markAllRead(): Promise<void> {
    const now = Date.now()
    this._rows_.update((rows) => rows.map((row) => (row.readAt === undefined ? { ...row, readAt: now } : row)))
    try {
      await firstValueFrom(this.http.post(`${URL()}/read-all`, {}))
    } catch (err) {
      this.warnWrite(err)
    }
  }

  private isHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden'
  }

  private warnWrite(err: unknown): void {
    this.logging.warn({
      event: 'notifications.write_failed',
      message: 'Marking alerts read failed',
      context: { status: String((err as { status?: number }).status) }
    })
  }
}
