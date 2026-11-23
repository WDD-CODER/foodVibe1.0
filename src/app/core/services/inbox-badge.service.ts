import { computed, effect, inject, Injectable, untracked } from '@angular/core'
import { ConversationDataService } from './conversation-data.service'
import { ModuleService } from './module.service'
import { UserService } from './user.service'

const REFRESH_GAP_MS = 60_000

/**
 * Plan 677: the one root signal for how many conversations wait for a person (a person holds them and the guest wrote
 * last, unread; test conversations left out). Built like `FrontDeskBadgeService`: loads once a member of a business with
 * `frontdesk` is signed in, reloads when the window regains focus (at most once per 60 s) and when `/inbox` opens.
 */
@Injectable({ providedIn: 'root' })
export class InboxBadgeService {
  private readonly conversations = inject(ConversationDataService)
  private readonly user = inject(UserService)
  private readonly modules = inject(ModuleService)
  private lastRefreshAt_ = 0

  readonly pendingCount_ = computed(() =>
    this.user.isLoggedIn()
      ? this.conversations.conversations_().filter((c) => c.status === 'human' && c.unread > 0 && !c.test).length
      : 0
  )

  constructor() {
    effect(() => {
      if (!this.user.isLoggedIn() || !this.modules.has('frontdesk')) return
      untracked(() => {
        this.lastRefreshAt_ = Date.now()
        void this.conversations.list()
      })
    })
    if (typeof window !== 'undefined') window.addEventListener('focus', () => void this.refresh())
  }

  /** Reloads the list. `force` skips the 60 s gap (the inbox opening). Does nothing when signed out. */
  async refresh(force = false): Promise<void> {
    if (!this.user.isLoggedIn()) return
    const now = Date.now()
    if (!force && now - this.lastRefreshAt_ < REFRESH_GAP_MS) return
    this.lastRefreshAt_ = now
    await this.conversations.list()
  }
}
