import { Injectable, inject } from '@angular/core'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { AuthModalService } from '@services/auth-modal.service'
import { UserService } from '@services/user.service'

/**
 * Shared auth guard: if the user is not signed in, shows warning, opens sign-in modal, and returns false.
 * Use in list/form components before add/edit/delete actions.
 * Example: if (!this.requireAuthService.requireAuth()) return;
 */
@Injectable({ providedIn: 'root' })
export class RequireAuthService {
  private readonly userService = inject(UserService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly authModal = inject(AuthModalService)

  requireAuth(): boolean {
    if (this.userService.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }
}
