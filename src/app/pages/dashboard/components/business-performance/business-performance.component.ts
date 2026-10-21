import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { DatePipe } from '@angular/common'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'
import type { BusinessStats, FunnelStage, StatsPeriod } from '@models/business-stats.model'
import { formatDecimal1, formatMoney, formatPct1, formatPctInt } from 'src/app/core/engine/rounding'
import { stageLabelKey } from 'src/app/core/utils/event-stage-ui.util'

/** One card as the template draws it: every text is ready to show. */
interface StatCard {
  key: string
  icon: string
  labelKey: string
  value: string
  /** Second line, e.g. the close rate or the hint that shows until a first event is finished. */
  note: string | null
  /** The "% vs before" label and whether it is good news; null on cards without a comparison. */
  change: { text: string; good: boolean } | null
}

const PERIODS: readonly { value: StatsPeriod; labelKey: string }[] = [
  { value: '30', labelKey: 'period_30' },
  { value: '90', labelKey: 'period_90' },
  { value: 'all', labelKey: 'period_all' }
]
const EMPTY = '—'

@Component({
  selector: 'app-business-performance',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, TranslatePipe],
  templateUrl: './business-performance.component.html',
  styleUrl: './business-performance.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BusinessPerformanceComponent {
  // 1. INJECTED
  private readonly stats = inject(BusinessStatsService)
  private readonly router = inject(Router)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)
  private readonly userMsg = inject(UserMsgService)
  private readonly user = inject(UserService)

  // 4. SIGNALS & CONSTANTS
  protected readonly periods = PERIODS
  private readonly period_ = signal<StatsPeriod>('30')
  readonly period = this.period_.asReadonly()
  private readonly stats_ = signal<BusinessStats | null>(null)
  private readonly loading_ = signal(true)
  readonly loading = this.loading_.asReadonly()
  /** Answers of an older period that arrive late are dropped. */
  private requestId = 0

  // 5. COMPUTED
  /** The five cards; empty for staff (the server sends no `cards`). */
  protected readonly cards = computed<StatCard[]>(() => {
    const cards = this.stats_()?.cards
    if (!cards) return []
    const accuracy = cards.accuracy
    return [
      {
        key: 'inquiries',
        icon: 'users',
        labelKey: 'stat_inquiries',
        value: String(cards.inquiries.value),
        note: null,
        change: this.change(cards.inquiries.changePct)
      },
      {
        key: 'closed',
        icon: 'check-circle',
        labelKey: 'stat_closed',
        value: String(cards.closed.value),
        note: `${this.t('stat_close_rate')} ${cards.closed.closeRatePct === null ? EMPTY : formatPctInt(cards.closed.closeRatePct)}`,
        change: this.change(cards.closed.changePct)
      },
      {
        key: 'revenue',
        icon: 'coins',
        labelKey: 'stat_revenue',
        value: formatMoney(cards.revenue.value),
        note: null,
        change: this.change(cards.revenue.changePct)
      },
      {
        key: 'accuracy',
        icon: 'activity',
        labelKey: 'stat_accuracy',
        value:
          accuracy.avgAccuracyPts === null
            ? EMPTY
            : this.fill('stat_accuracy_value', { pts: this.signedInt(accuracy.avgAccuracyPts) }),
        note:
          accuracy.avgAccuracyPts === null || accuracy.avgActualProfitPct === null
            ? this.t('stat_accuracy_empty')
            : this.fill('stat_avg_actual_profit', { pct: formatPct1(accuracy.avgActualProfitPct) }),
        change: accuracy.avgAccuracyPts === null ? null : this.changePoints(accuracy.vsBaselinePts)
      },
      {
        key: 'usage',
        icon: 'calendar-clock',
        labelKey: 'stat_usage_per_week',
        value: formatDecimal1(cards.usage.perWeek),
        note: null,
        change: null
      }
    ]
  })
  protected readonly funnel = computed<(FunnelStage & { share: number })[]>(() => {
    const funnel = this.stats_()?.funnel ?? []
    const max = Math.max(1, ...funnel.map((f) => f.count))
    return funnel.map((f) => ({ ...f, share: (f.count / max) * 100 }))
  })
  protected readonly upcoming = computed(() => this.stats_()?.upcoming ?? [])
  protected readonly hasStats = computed(() => this.stats_() !== null)
  /** A business that has not created anything yet: zeros everywhere. */
  protected readonly isEmpty = computed(() => {
    const stats = this.stats_()
    if (!stats) return false
    const cards = stats.cards
    const noCards = !cards || (cards.inquiries.value === 0 && cards.closed.value === 0)
    return noCards && stats.funnel.every((f) => f.count === 0) && stats.upcoming.length === 0
  })

  constructor() {
    effect(() => {
      const period = this.period_()
      if (!this.user.isLoggedIn()) return
      untracked(() => void this.load(period))
    })
  }

  // 6. METHODS (UI handlers)
  protected selectPeriod(period: StatsPeriod): void {
    this.period_.set(period)
  }

  protected openStage(stage: string): void {
    void this.router.navigate(['/menu-library'], { queryParams: { stage } })
  }

  protected openEvent(id: string): void {
    void this.router.navigate(['/menu-intelligence', id])
  }

  protected createFirstInquiry(): void {
    void this.router.navigate(['/menu-library'], { queryParams: { new: 'inquiry' } })
  }

  protected stageKey(stage: string | null): string {
    return stage ? stageLabelKey(stage as FunnelStage['stage']) : ''
  }

  private async load(period: StatsPeriod): Promise<void> {
    const id = ++this.requestId
    this.loading_.set(true)
    try {
      const result = await this.stats.get(period)
      if (id === this.requestId) this.stats_.set(result)
    } catch (err) {
      if (id !== this.requestId) return
      this.logging.error({
        event: 'dashboard.stats_failed',
        message: 'Loading the dashboard numbers failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.t('save_failed'))
    } finally {
      if (id === this.requestId) this.loading_.set(false)
    }
  }

  private t(key: string): string {
    return this.translation.translate(key)
  }

  private fill(key: string, params: Record<string, string>): string {
    return Object.entries(params).reduce((text, [name, value]) => text.replace(`{{${name}}}`, value), this.t(key))
  }

  /** "+3" / "−1" / "0" with a real minus sign. */
  private signedInt(n: number): string {
    const rounded = Math.round(n)
    if (rounded === 0) return '0'
    return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}`
  }

  private change(pct: number | null): StatCard['change'] {
    if (pct === null) return { text: this.t('stat_no_baseline'), good: true }
    const sign = Math.round(pct) < 0 ? '−' : '+'
    return { text: this.fill('stat_vs_before', { pct: `${sign}${formatPctInt(Math.abs(pct))}` }), good: pct >= 0 }
  }

  /** Same label for a difference measured in percentage points. */
  private changePoints(points: number | null): StatCard['change'] {
    if (points === null) return { text: this.t('stat_no_baseline'), good: true }
    const pct = `${this.signedInt(points)} ${this.t('stat_points_short')}`
    return { text: this.fill('stat_vs_before', { pct }), good: points >= 0 }
  }
}
