import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService, type SetupStatus } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'

/** One line of the checklist: its text, whether the status says it is done, and where it is done. */
interface SetupStep {
  key: string
  labelKey: string
  done: boolean
  optional: boolean
  path: string
  queryParams?: Record<string, string>
}

/** How many products with a price make the first step done. */
const PRICED_PRODUCTS_GOAL = 10
const HIDDEN_KEY_PREFIX = 'fv_setup_card_hidden_'

@Component({
  selector: 'app-setup-checklist-card',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, TranslatePipe],
  templateUrl: './setup-checklist-card.component.html',
  styleUrl: './setup-checklist-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetupChecklistCardComponent {
  // 1. INJECTED
  private readonly router = inject(Router)
  private readonly businessService = inject(BusinessService)
  private readonly permission = inject(PermissionService)
  private readonly logging = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  private readonly status_ = signal<SetupStatus | null>(null)
  private readonly isHidden_ = signal(false)
  /** One-shot guards: the first-visit redirect and the status request each happen once per card. */
  private readonly isRedirected_ = signal(false)
  private readonly isStatusRequested_ = signal(false)

  // 5. COMPUTED
  protected readonly steps = computed<SetupStep[]>(() => {
    const status = this.status_()
    return [
      {
        key: 'products',
        labelKey: 'setup_step_products',
        done: (status?.pricedProducts ?? 0) >= PRICED_PRODUCTS_GOAL,
        optional: false,
        path: '/inventory/add'
      },
      {
        key: 'supplier',
        labelKey: 'setup_step_supplier',
        done: (status?.suppliers ?? 0) >= 1,
        optional: false,
        path: '/suppliers/add'
      },
      {
        key: 'recipe',
        labelKey: 'setup_step_recipe',
        done: (status?.recipes ?? 0) >= 1,
        optional: false,
        path: '/recipe-builder'
      },
      {
        key: 'event',
        labelKey: 'setup_step_event',
        done: (status?.events ?? 0) >= 1,
        optional: false,
        path: '/menu-intelligence'
      },
      {
        key: 'staff',
        labelKey: 'setup_step_staff',
        done: (status?.staff ?? 0) >= 1,
        optional: true,
        path: '/settings',
        queryParams: { tab: 'team' }
      }
    ]
  })
  protected readonly doneRequired = computed(() => this.steps().filter((step) => !step.optional && step.done).length)
  /** Shown only to the owner, after the status arrived, until the four required steps are done or the owner hides it. */
  protected readonly visible = computed(
    () => this.permission.isOwner_() && this.status_() !== null && !this.isHidden_() && this.doneRequired() < 4
  )

  constructor() {
    effect(() => {
      const business = this.businessService.business_()
      if (!this.permission.isOwner_() || !business) return
      untracked(() => {
        // `''` redirects to /dashboard and sign-in happens in a modal on top of it, so the business may arrive after the card exists.
        if (business.baseline === undefined) {
          if (this.isRedirected_()) return
          this.isRedirected_.set(true)
          void this.router.navigate(['/settings'], { queryParams: { tab: 'baseline', first: 1 } })
          return
        }
        this.isHidden_.set(this.readHidden(business._id))
        if (this.isHidden_()) return
        if (this.isStatusRequested_()) return
        this.isStatusRequested_.set(true)
        void this.loadStatus()
      })
    })
  }

  // 6. METHODS (UI handlers)
  /** Hides the card on this device for good. Storage may be blocked: the card then hides until the page reloads. */
  protected hide(): void {
    this.isHidden_.set(true)
    const id = this.businessService.business_()?._id
    if (!id) return
    try {
      localStorage.setItem(HIDDEN_KEY_PREFIX + id, '1')
    } catch {
      // Per-device convenience only.
    }
  }

  private readHidden(businessId: string): boolean {
    try {
      return localStorage.getItem(HIDDEN_KEY_PREFIX + businessId) === '1'
    } catch {
      return false
    }
  }

  private async loadStatus(): Promise<void> {
    try {
      this.status_.set(await this.businessService.loadSetupStatus())
    } catch (err) {
      this.logging.warn('Setup status could not be loaded', { err: String(err) })
    }
  }
}
