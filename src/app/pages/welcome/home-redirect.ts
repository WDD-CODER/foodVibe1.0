import { inject } from '@angular/core'
import { UserService } from '@services/user.service'
import { isReturningVisitor } from '../../core/utils/returning-visitor.util'

/** Where the bare address leads: the welcome screen for a first-time visitor, the dashboard for everyone else. */
export const homeRedirect = (): string =>
  inject(UserService).isLoggedIn() || isReturningVisitor() ? 'dashboard' : 'welcome'
