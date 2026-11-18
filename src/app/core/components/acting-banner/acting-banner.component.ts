import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'

/**
 * Plan 632: a persistent bar under the header that names the business the user is acting in, with one
 * button back to his own. Shown only while `acting_` is set (a consultant, or the platform admin inside a business).
 */
@Component({
  selector: 'app-acting-banner',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './acting-banner.component.html',
  styleUrl: './acting-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActingBannerComponent {
  private readonly userService = inject(UserService)
  private readonly business = inject(BusinessService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  protected readonly acting_ = this.userService.acting_
  protected readonly isSwitching_ = signal(false)

  /** The banner text with the active business's name in it (empty name until the business loads). */
  protected readonly text_ = computed(() => {
    const key = this.acting_() === 'platform' ? 'acting_banner_platform' : 'acting_banner_consultant'
    return this.translation.translate(key).replace('{name}', this.business.business_()?.name ?? '')
  })

  protected async backHome(): Promise<void> {
    this.isSwitching_.set(true)
    const ok = await this.userService.switchBusiness(null)
    if (!ok) {
      this.isSwitching_.set(false)
      this.userMsg.onSetErrorMsg(this.translation.translate('switch_failed'))
    }
  }
}
