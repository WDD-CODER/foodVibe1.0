import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'

/**
 * Stands where the business-performance area would be while the owner has never answered the opening details (plan 469).
 * Open goes to Settings → opening details; skip stores an empty baseline, after which the performance area returns.
 */
@Component({
  selector: 'app-opening-details-banner',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './opening-details-banner.component.html',
  styleUrl: './opening-details-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OpeningDetailsBannerComponent {
  // 1. INJECTED
  private readonly router = inject(Router)
  private readonly businessService = inject(BusinessService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  protected readonly isSaving_ = signal(false)

  // 6. METHODS (UI handlers)
  protected open(): void {
    void this.router.navigate(['/settings'], { queryParams: { tab: 'baseline', first: 1 } })
  }

  /** Stores `{}` ("answered: nothing to add"); the business signal updates and the dashboard drops the banner. */
  protected async skip(): Promise<void> {
    if (this.isSaving_()) return
    this.isSaving_.set(true)
    try {
      await this.businessService.updateBaseline({})
    } catch (err) {
      const status = (err as { status?: number }).status
      // A 403 already got the "no permission" toast from the interceptor.
      if (status !== 403) {
        this.logging.error('Baseline could not be skipped', { status })
        this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }
}
