import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService, type FrontDeskSetup } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'

/** Plan 556: what the front desk still needs (computed by the server); owner only, hides itself when all is done. */
@Component({
  selector: 'app-front-desk-checklist-card',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, TranslatePipe],
  templateUrl: './front-desk-checklist-card.component.html',
  styleUrl: './front-desk-checklist-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontDeskChecklistCardComponent {
  private readonly businessService = inject(BusinessService)
  private readonly permission = inject(PermissionService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  private readonly setup_ = signal<FrontDeskSetup | null>(null)
  private readonly isRequested_ = signal(false)

  protected readonly rows_ = computed(() =>
    (this.setup_()?.items ?? []).map((item) => ({
      ...item,
      labelKey: 'frontdesk_setup_' + item.key,
      path: item.key === 'test_request' ? '/requests' : '/frontdesk/onboarding'
    }))
  )
  protected readonly hasProfile_ = computed(() => (this.setup_()?.businessType ?? null) !== null)
  protected readonly progress_ = computed(() =>
    this.translation
      .translate('frontdesk_setup_progress')
      .replace('{{done}}', String(this.setup_()?.done ?? 0))
      .replace('{{total}}', String(this.setup_()?.total ?? 0))
  )
  /** Shown to the owner once the status arrived; hidden when every item is done. */
  protected readonly visible_ = computed(() => {
    const setup = this.setup_()
    if (!this.permission.isOwner_() || !setup) return false
    return setup.businessType === null || setup.done < setup.total
  })

  constructor() {
    effect(() => {
      const business = this.businessService.business_()
      if (!this.permission.isOwner_() || !business) return
      untracked(() => {
        if (this.isRequested_()) return
        this.isRequested_.set(true)
        void this.load()
      })
    })
  }

  private async load(): Promise<void> {
    try {
      this.setup_.set((await this.businessService.loadSetupStatus()).frontDesk ?? null)
    } catch (err) {
      this.logging.warn('Front desk setup status could not be loaded', { err: String(err) })
    }
  }
}
