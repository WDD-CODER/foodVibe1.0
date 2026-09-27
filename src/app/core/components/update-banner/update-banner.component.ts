import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AppUpdateService } from '@services/app-update.service'

@Component({
  selector: 'app-update-banner',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './update-banner.component.html',
  styleUrl: './update-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpdateBannerComponent {
  protected readonly appUpdate = inject(AppUpdateService)

  protected reload(): void {
    this.appUpdate.reload()
  }
}
