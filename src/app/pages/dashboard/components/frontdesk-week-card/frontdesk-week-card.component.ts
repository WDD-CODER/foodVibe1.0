import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import type { FrontDeskStats } from '@models/frontdesk-stats.model'
import { formatDecimal1 } from 'src/app/core/engine/rounding'

const DAY_MS = 86_400_000
const WEEK_DAYS = 7
const USAGE_DAYS = 90

/** Israel calendar date (YYYY-MM-DD) of an instant, `daysBack` days earlier. */
function israelDate(nowMs: number, daysBack: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(nowMs - daysBack * DAY_MS))
}

/** Plan 559: "this week at the front desk" — one sentence from the server's numbers; owner only; hidden until the business has any request. */
@Component({
  selector: 'app-frontdesk-week-card',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, TranslatePipe],
  templateUrl: './frontdesk-week-card.component.html',
  styleUrl: './frontdesk-week-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontDeskWeekCardComponent {
  private readonly businessService = inject(BusinessService)
  private readonly stats = inject(BusinessStatsService)
  private readonly permission = inject(PermissionService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  private readonly week_ = signal<FrontDeskStats | null>(null)
  private readonly usageTotal_ = signal(0)
  private readonly isRequested_ = signal(false)

  protected readonly visible_ = computed(() => this.week_() !== null && this.usageTotal_() > 0)

  protected readonly sentence_ = computed(() => {
    const w = this.week_()
    if (!w) return ''
    const t = (key: string): string => this.translation.translate(key)
    const guest = w.requests.total - w.requests.byChannel.manual
    let first = t('frontdesk_week_requests').replace('{{m}}', String(w.requests.total))
    if (w.afterHoursPct !== null) {
      const k = Math.round((w.afterHoursPct / 100) * guest)
      first += ' ' + t('frontdesk_week_after_hours').replace('{{k}}', String(k))
    }
    first += '.'
    if (w.medianMinutesToDecision === null) return first
    const decided = t('frontdesk_week_decided')
      .replace('{{x}}', String(w.outcomes.approved))
      .replace('{{y}}', formatDecimal1(w.medianMinutesToDecision))
    return `${first} ${decided}`
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
    const now = Date.now()
    try {
      const [week, usage] = await Promise.all([
        this.stats.getFrontDesk({ from: israelDate(now, WEEK_DAYS - 1), to: israelDate(now, 0) }),
        this.stats.getFrontDesk({ from: israelDate(now, USAGE_DAYS - 1), to: israelDate(now, 0) })
      ])
      this.usageTotal_.set(usage.requests.total)
      this.week_.set(week)
    } catch (err) {
      this.logging.warn('Front desk week numbers could not be loaded', { err: String(err) })
    }
  }
}
