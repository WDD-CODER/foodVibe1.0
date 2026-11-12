import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { UserService } from '../../services/user.service'
import { TermsService } from '../../services/terms.service'
import { TranslationService } from '../../services/translation.service'
import { UserMsgService } from '../../services/user-msg.service'
import { TermsModalComponent } from '../terms-modal/terms-modal.component'

/** The id of the local dev guest and of nobody else (server/routes/auth.js POST /guest). */
const DEV_GUEST_ID = 'dev-guest'

/**
 * Plan 584: shows the terms popup, with no close button, to a signed-in user whose accepted version is not the
 * current one: an account that never accepted, and every account after each new `version` of the terms file.
 */
@Component({
  selector: 'app-terms-gate',
  standalone: true,
  imports: [TermsModalComponent],
  templateUrl: './terms-gate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermsGateComponent {
  private readonly userService_ = inject(UserService)
  private readonly termsService_ = inject(TermsService)
  private readonly translation_ = inject(TranslationService)
  private readonly userMsg_ = inject(UserMsgService)

  /** The version of the terms file, read when a real user is signed in. */
  protected readonly currentVersion_ = signal<string | null>(null)
  protected readonly isPosting_ = signal(false)

  private readonly signedInId_ = computed(() => {
    const user = this.userService_.user_()
    return user && user._id !== DEV_GUEST_ID ? (user._id ?? null) : null
  })

  protected readonly isVisible_ = computed(() => {
    const version = this.currentVersion_()
    if (this.signedInId_() === null || version === null) return false
    return (this.userService_.user_()?.termsAcceptedVersion ?? null) !== version
  })

  constructor() {
    effect(() => {
      if (this.signedInId_() === null) return
      untracked(() =>
        this.termsService_.load().subscribe({
          next: (terms) => this.currentVersion_.set(terms.version),
          error: () => this.currentVersion_.set(null)
        })
      )
    })
  }

  protected onAccepted(version: string): void {
    this.isPosting_.set(true)
    this.termsService_.accept(version).subscribe({
      next: () => this.isPosting_.set(false),
      error: () => {
        this.isPosting_.set(false)
        this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
      }
    })
  }
}
