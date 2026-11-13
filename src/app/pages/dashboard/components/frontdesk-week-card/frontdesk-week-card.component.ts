import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import type { FrontDeskStats } from '@models/frontdesk-stats.model'
import { BusinessService } from '@services/business.service'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'

/** The look-back that decides whether the business uses the front desk at all. */
const USAGE_LOOKBACK_DAYS = 90
const DAY_MS = 86400000
const israelDate = (ms: number): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(ms))

/** Plan 559: this week's front desk numbers as one sentence. Owner only; hidden while the business has no requests at all. */
@Component({
  selector: 'app-frontdesk-week-card',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, TranslatePipe],
  templateUrl: './frontdesk-week-card.component.html',
  styleUrl: './frontdesk-week-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontDeskWeekCardComponent {
  private readonly stats = inject(BusinessStatsService)
  private readonly businessService = inject(BusinessService)
  private readonly permission = inject(PermissionService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  private readonly week_ = signal<FrontDeskStats | null>(null)
  private readonly usedRecently_ = signal(false)
  private readonly isRequested_ = signal(false)

  protected readonly visible = computed(
    () => this.permission.isOwner_() && this.week_() !== null && this.usedRecently_()
  )

  /** «השבוע התקבלו {{m}} בקשות ({{k}} מחוץ לשעות הפתיחה). אישרת {{x}} בחציון של {{y}} דקות.» — parts with no value are left out. */
  protected readonly sentence = computed(() => {
    const week = this.week_()
    if (!week) return ''
    const t = (key: string): string => this.translation.translate(key)
    let text = t('frontdesk_week_requests').replace('{{m}}', String(week.requests.total))
    if (week.afterHoursPct !== null) {
      const k = Math.round((week.afterHoursPct / 100) * (week.requests.total - week.requests.byChannel.manual))
      text += ' ' + t('frontdesk_week_after_hours').replace('{{k}}', String(k))
    }
    text += '.'
    if (week.medianMinutesToDecision !== null) {
      text +=
        ' ' +
        t('frontdesk_week_decided')
          .replace('{{x}}', String(week.outcomes.approved))
          .replace('{{y}}', String(Math.round(week.medianMinutesToDecision)))
    }
    return text
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
      const now = Date.now()
      const [week, recent] = await Promise.all([
        this.stats.getFrontDesk(),
        this.stats.getFrontDesk({ from: israelDate(now - (USAGE_LOOKBACK_DAYS - 1) * DAY_MS), to: israelDate(now) })
      ])
      this.usedRecently_.set(recent.requests.total > 0)
      this.week_.set(week)
    } catch (err) {
      this.logging.warn('Front desk week numbers could not be loaded', { err: String(err) })
    }
  }
}
