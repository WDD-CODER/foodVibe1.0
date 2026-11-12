import { computed, effect, inject, Injectable, untracked } from '@angular/core'
import { RequestDataService } from './request-data.service'
import { UserService } from './user.service'

/** Statuses that count as waiting for a decision. */
export const WAITING_STATUSES: readonly string[] = ['new', 'qualified', 'needs_info']
const REFRESH_GAP_MS = 60_000

/**
 * Plan 552: the one root signal for how many requests wait for a decision (test requests left out). Header and tab
 * chips both read it. It loads the requests once a member is signed in and reloads when the window regains focus (at
 * most once per 60 s) and when `/requests` opens. No timer, no websocket.
 */
@Injectable({ providedIn: 'root' })
export class FrontDeskBadgeService {
  private readonly requests = inject(RequestDataService)
  private readonly user = inject(UserService)
  private lastRefreshAt_ = 0

  readonly waitingCount_ = computed(
    () => this.requests.all_().filter((r) => WAITING_STATUSES.includes(r.status) && !r.test).length
  )

  constructor() {
    effect(() => {
      if (!this.user.isLoggedIn()) return
      untracked(() => {
        this.lastRefreshAt_ = Date.now()
        void this.requests.ensureLoaded()
      })
    })
    if (typeof window !== 'undefined') window.addEventListener('focus', () => void this.refresh())
  }

  /** Reloads the requests. `force` skips the 60 s gap (the requests page opening). Does nothing when signed out. */
  async refresh(force = false): Promise<void> {
    if (!this.user.isLoggedIn()) return
    const now = Date.now()
    if (!force && now - this.lastRefreshAt_ < REFRESH_GAP_MS) return
    this.lastRefreshAt_ = now
    await this.requests.reloadFromStorage()
  }
}
