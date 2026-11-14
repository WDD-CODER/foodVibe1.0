import { Injectable, effect, inject, untracked } from '@angular/core'
import { Router } from '@angular/router'
import { UserService } from './user.service'

/**
 * Plan 591: when the signed-in user goes from a user to null (the sign-out button or a session that ended),
 * moves the visitor to the welcome page. The first read (page load with no user) is the guards' job.
 */
@Injectable({ providedIn: 'root' })
export class SignedOutRedirectService {
  private readonly userService_ = inject(UserService)
  private readonly router_ = inject(Router)
  private wasSignedIn_: boolean | null = null

  constructor() {
    effect(() => {
      const isSignedIn = this.userService_.user_() !== null
      const wasSignedIn = this.wasSignedIn_
      this.wasSignedIn_ = isSignedIn
      if (wasSignedIn !== true || isSignedIn) return
      untracked(() => {
        const url = this.router_.url
        if (url === '/welcome' || url.startsWith('/welcome?') || url.startsWith('/welcome#')) return
        void this.router_.navigate(['/welcome'])
      })
    })
  }
}
