import { inject } from '@angular/core'
import { UserService } from '@services/user.service'
import { isReturningVisitor } from '../../core/utils/returning-visitor.util'

/** Where the bare address leads: the welcome screen for a first-time visitor, the dashboard for everyone else. */
export const homeRedirect = (): string =>
  inject(UserService).isLoggedIn() || isReturningVisitor() ? 'dashboard' : 'welcome'

/** Plan 589: the in-app path a visitor wanted before being sent to the welcome page; else the dashboard. */
export const safeReturnUrl = (raw: string | null | undefined): string =>
  raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/' + String.fromCharCode(92))
    ? raw
    : '/dashboard'
