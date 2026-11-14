import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { safeReturnUrl } from './home-redirect'

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './welcome.page.html',
  styleUrl: './welcome.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomePage {
  private readonly user = inject(UserService)
  private readonly authModal = inject(AuthModalService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  protected readonly rooms = [
    { icon: 'coins', titleKey: 'welcome_room_office_title', textKey: 'welcome_room_office_text' },
    { icon: 'chef-hat', titleKey: 'welcome_room_kitchen_title', textKey: 'welcome_room_kitchen_text' },
    { icon: 'utensils', titleKey: 'welcome_room_table_title', textKey: 'welcome_room_table_text' }
  ]

  constructor() {
    // A returning session that the silent refresh restores leaves the screen by itself.
    effect(() => {
      if (this.user.user_()) void this.router.navigateByUrl(this.returnUrl(), { replaceUrl: true })
    })
  }

  private returnUrl(): string {
    return safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'))
  }

  protected signIn(): void {
    this.authModal.open('sign-in', this.returnUrl())
  }

  protected signUp(): void {
    this.authModal.open('sign-up', this.returnUrl())
  }
}
