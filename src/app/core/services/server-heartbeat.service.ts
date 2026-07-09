import { DestroyRef, Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { catchError, of } from 'rxjs'
import { environment } from '../../../environments/environment'

/** Ping interval — well under Render Free ~15 min idle sleep. */
const PING_INTERVAL_MS = 4 * 60 * 1000

/** Stop pings after the tab stays hidden this long so Free tier can sleep. */
const HIDDEN_GRACE_MS = 2 * 60 * 1000

/**
 * Keeps the Render Free-tier service awake only while a user has the SPA
 * open and visible. Stops traffic when the tab is hidden (after a short
 * grace) or on app teardown — does not shut down the process.
 */
@Injectable({ providedIn: 'root' })
export class ServerHeartbeatService {
  private readonly http_ = inject(HttpClient)
  private readonly destroyRef_ = inject(DestroyRef)

  private started_ = false
  private intervalId_: ReturnType<typeof setInterval> | null = null
  private hiddenTimerId_: ReturnType<typeof setTimeout> | null = null

  private readonly onVisibility_ = (): void => {
    this.handleVisibility_()
  }

  start(): void {
    if (this.started_ || !environment.useBackend) return
    this.started_ = true
    this.handleVisibility_()
    document.addEventListener('visibilitychange', this.onVisibility_)
    this.destroyRef_.onDestroy(() => this.stop_())
  }

  private handleVisibility_(): void {
    if (document.visibilityState === 'visible') {
      this.clearHiddenTimer_()
      this.ping_()
      this.startInterval_()
      return
    }
    this.clearHiddenTimer_()
    this.hiddenTimerId_ = setTimeout(() => this.stopInterval_(), HIDDEN_GRACE_MS)
  }

  private startInterval_(): void {
    if (this.intervalId_ != null) return
    this.intervalId_ = setInterval(() => this.ping_(), PING_INTERVAL_MS)
  }

  private stopInterval_(): void {
    if (this.intervalId_ == null) return
    clearInterval(this.intervalId_)
    this.intervalId_ = null
  }

  private clearHiddenTimer_(): void {
    if (this.hiddenTimerId_ == null) return
    clearTimeout(this.hiddenTimerId_)
    this.hiddenTimerId_ = null
  }

  private stop_(): void {
    document.removeEventListener('visibilitychange', this.onVisibility_)
    this.clearHiddenTimer_()
    this.stopInterval_()
    this.started_ = false
  }

  private ping_(): void {
    this.http_
      .get<{ ok: boolean; ts: number }>(`${environment.authApiUrl}/api/v1/health`)
      .pipe(catchError(() => of(null)))
      .subscribe()
  }
}
