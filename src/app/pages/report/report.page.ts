import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { map } from 'rxjs/operators'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import type {
  BusinessReport,
  ReportFinding,
  ReportMetricKey,
  ReportMonths,
  ReportValue
} from '@models/business-report.model'
import { formatDecimal1, formatMoney, formatPct1 } from 'src/app/core/engine/rounding'

type Kind = 'count' | 'money' | 'pct'

/** The closed metric list, in the order the page shows it; `kind` decides how a number is written. */
const METRICS: readonly { key: ReportMetricKey; kind: Kind; labelKey: string }[] = [
  { key: 'inquiries', kind: 'count', labelKey: 'report_metric_inquiries' },
  { key: 'eventsClosed', kind: 'count', labelKey: 'report_metric_events_closed' },
  { key: 'closeRatePct', kind: 'pct', labelKey: 'report_metric_close_rate_pct' },
  { key: 'revenue', kind: 'money', labelKey: 'report_metric_revenue' },
  { key: 'revenuePerEvent', kind: 'money', labelKey: 'report_metric_revenue_per_event' },
  { key: 'foodCostPct', kind: 'pct', labelKey: 'report_metric_food_cost_pct' },
  { key: 'profitPct', kind: 'pct', labelKey: 'report_metric_profit_pct' },
  { key: 'profitPerGuest', kind: 'money', labelKey: 'report_metric_profit_per_guest' },
  { key: 'pricingAccuracyPts', kind: 'pct', labelKey: 'report_metric_pricing_accuracy_pts' },
  { key: 'supplierOverrunPct', kind: 'pct', labelKey: 'report_metric_supplier_overrun_pct' },
  { key: 'partialPricesPct', kind: 'pct', labelKey: 'report_metric_partial_prices_pct' },
  { key: 'activeDays', kind: 'count', labelKey: 'report_metric_active_days' }
]
const MONTH_OPTIONS: readonly { value: ReportMonths; labelKey: string }[] = [
  { value: 3, labelKey: 'report_months_3' },
  { value: 6, labelKey: 'report_months_6' },
  { value: 12, labelKey: 'report_months_12' }
]
const EMPTY = '—'

interface Tile {
  key: ReportMetricKey
  labelKey: string
  start: string
  latest: string | null
  startEnough: boolean
  latestEnough: boolean
  change: { icon: string; text: string } | null
  estimate: string | null
}
interface TrendRow {
  key: ReportMetricKey
  labelKey: string
  cells: { month: string; text: string; share: number; enough: boolean }[]
}

/** Plan 568: the business report — measured start vs latest, monthly trend, findings; prints on one A4 page. */
@Component({
  selector: 'app-report-page',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent],
  templateUrl: './report.page.html',
  styleUrl: './report.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportPage {
  // 1. INJECTED
  private readonly stats = inject(BusinessStatsService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  protected readonly monthOptions = MONTH_OPTIONS
  private readonly query = toSignal(
    this.route.queryParamMap.pipe(map((q) => ({ months: q.get('months'), businessId: q.get('businessId') }))),
    { initialValue: { months: null as string | null, businessId: null as string | null } }
  )
  private readonly report_ = signal<BusinessReport | null>(null)
  private readonly forbidden_ = signal(false)
  private readonly loading_ = signal(true)
  readonly report = this.report_.asReadonly()
  readonly forbidden = this.forbidden_.asReadonly()
  readonly loading = this.loading_.asReadonly()
  private requestId = 0

  // 5. COMPUTED
  readonly months = computed<ReportMonths>(() => {
    const n = Number(this.query().months)
    return n === 3 || n === 12 ? n : 6
  })
  readonly isEmpty = computed(() => this.report() !== null && this.report()!.firstEventAt === null)

  protected readonly tiles = computed<Tile[]>(() => {
    const r = this.report()
    if (!r) return []
    return METRICS.map((m) => {
      const s = r.start.metrics[m.key]
      const l = r.latest.metrics[m.key]
      const est = r.baseline?.[m.key]
      return {
        key: m.key,
        labelKey: m.labelKey,
        start: this.format(s, m.kind),
        latest: r.comparable ? this.format(l, m.kind) : null,
        startEnough: s.enough,
        latestEnough: l.enough,
        change: r.comparable ? this.changeOf(r, m.key, m.kind) : null,
        estimate: est === undefined ? null : this.formatNumber(est, m.kind)
      }
    })
  })
  protected readonly hasEstimates = computed(() => !!this.report()?.baseline)
  protected readonly estimatesOnlyLine = computed(() => {
    const e = this.report()?.estimatesOnly
    if (!e) return ''
    const parts: string[] = []
    if (e.hoursPerWeekOrdering !== undefined)
      parts.push(`${this.t('report_est_hours_ordering')}: ${formatDecimal1(e.hoursPerWeekOrdering)}`)
    if (e.hoursPerWeekQuotes !== undefined)
      parts.push(`${this.t('report_est_hours_quotes')}: ${formatDecimal1(e.hoursPerWeekQuotes)}`)
    if (e.wastePct !== undefined) parts.push(`${this.t('report_est_waste')}: ${formatPct1(e.wastePct)}`)
    return parts.join(' · ')
  })
  protected readonly trend = computed<TrendRow[]>(() => {
    const r = this.report()
    if (!r) return []
    return METRICS.map((m) => {
      const points = r.series[m.key] ?? []
      const max = Math.max(0, ...points.map((p) => (p.enough && p.value !== null ? Math.abs(p.value) : 0)))
      return {
        key: m.key,
        labelKey: m.labelKey,
        cells: points.map((p) => ({
          month: p.month,
          text: this.format(p, m.kind),
          share: p.enough && p.value !== null && max > 0 ? (Math.abs(p.value) / max) * 100 : 0,
          enough: p.enough
        }))
      }
    })
  })
  protected readonly findings = computed(() =>
    (this.report()?.findings ?? []).map((f) => ({ ...f, text: this.findingText(f) }))
  )

  constructor() {
    effect(() => {
      const { businessId } = this.query()
      void this.load(this.months(), businessId ?? undefined)
    })
  }

  // 7. PUBLIC
  selectMonths(value: ReportMonths): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { months: value },
      queryParamsHandling: 'merge'
    })
  }

  print(): void {
    window.print()
  }

  // 8. PRIVATE
  private async load(months: ReportMonths, businessId?: string): Promise<void> {
    const id = ++this.requestId
    this.loading_.set(true)
    this.forbidden_.set(false)
    try {
      const report = await this.stats.getReport(months, businessId)
      if (id === this.requestId) this.report_.set(report)
    } catch (err) {
      if (id !== this.requestId) return
      this.report_.set(null)
      if (err instanceof HttpErrorResponse && err.status === 403) this.forbidden_.set(true)
      else this.logging.error({ event: 'report.load.failed', message: 'Could not load the business report' })
    } finally {
      if (id === this.requestId) this.loading_.set(false)
    }
  }

  private t(key: string): string {
    return this.translation.translate(key)
  }

  private formatNumber(n: number, kind: Kind): string {
    if (kind === 'money') return formatMoney(n)
    if (kind === 'pct') return formatPct1(n)
    return formatDecimal1(n)
  }

  private format(v: ReportValue, kind: Kind): string {
    return v.enough && v.value !== null ? this.formatNumber(v.value, kind) : EMPTY
  }

  private changeOf(r: BusinessReport, key: ReportMetricKey, kind: Kind): { icon: string; text: string } | null {
    const c = r.change[key]
    const v = kind === 'pct' ? c?.changePts : c?.changePct
    if (v === null || v === undefined) return null
    const icon = Math.abs(v) < 0.05 ? 'minus' : v > 0 ? 'trending-up' : 'trending-down'
    const sign = v > 0 ? '+' : ''
    return {
      icon,
      text:
        kind === 'pct' ? `${sign}${formatDecimal1(v)} ${this.t('stat_points_short')}` : `${sign}${formatDecimal1(v)}%`
    }
  }

  private findingText(f: ReportFinding): string {
    const template = this.t('report_finding_' + f.key)
    if (f.key === 'top_not_closed_reason')
      return template.replace('{{reason}}', this.t('not_closed_reason_' + String(f.value)))
    if (f.key === 'top_supplier_overrun' && typeof f.value === 'object') {
      return template.replace('{{name}}', f.value.name).replace('{{pct}}', formatDecimal1(f.value.overrunPct))
    }
    return template.replace('{{n}}', String(f.value))
  }
}
