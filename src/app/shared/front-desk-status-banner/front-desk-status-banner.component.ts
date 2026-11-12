import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'

/** Plan 557: a one-line amber notice for members of a business whose front desk is suspended. Nothing for other states. */
@Component({
  selector: 'app-front-desk-status-banner',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './front-desk-status-banner.component.html',
  styleUrl: './front-desk-status-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontDeskStatusBannerComponent {
  private readonly profiles = inject(FrontDeskProfileDataService)

  protected readonly isSuspended_ = computed(() => this.profiles.profile_()?.status === 'suspended')

  constructor() {
    void this.profiles.ensureLoaded()
  }
}
