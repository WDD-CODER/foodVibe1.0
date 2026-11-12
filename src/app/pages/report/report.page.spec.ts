import type { FrontDeskStats } from '@models/frontdesk-stats.model'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { LucideAngularModule, TrendingDown, TrendingUp } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import type { BusinessReport, ReportMetricKey, ReportValue } from '@models/business-report.model'
import { ReportPage } from './report.page'

const DICTIONARY: Record<string, string> = {
  report_not_enough_data: 'אין מספיק נתונים',
  report_before_foodvibe: 'לפני FoodVibe',
  report_owner_estimate: 'הערכת בעל העסק',
  report_owner_only: 'הדוח זמין לבעל העסק בלבד',
  report_too_early: 'עוד מוקדם להשוואה',
  report_finding_below_profit_target: '{{n}} אירועים נסגרו מתחת ליעד הרווח',
  report_finding_top_not_closed_reason: 'הסיבה הנפוצה: {{reason}}',
  not_closed_reason_price: 'מחיר'
}

function fdStats(total: number, extra: Partial<FrontDeskStats> = {}): FrontDeskStats {
  return {
    from: '2026-09-01',
    to: '2026-11-12',
    requests: {
      total,
      perDay: total / 10,
      byChannel: { manual: 1, public_form: Math.max(total - 1, 0), whatsapp: 0 },
      byKind: { table: total, event: 0, tasting: 0, consultation: 0 }
    },
    afterHoursPct: 25,
    outcomes: { approved: 0, declined: 0, expired: 0, cancelled: 0, waiting: total },
    declinesByReason: { full: 0, out_of_area: 0, below_minimum: 0, date_taken: 0, other: 0 },
    medianMinutesToDecision: 12,
    bookings: { total: 0, noShowRatePct: null, enough: false },
    eventsFromRequests: { count: 2, revenue: 0 },
    baseline: null,
    ...extra
  }
}

const KEYS: ReportMetricKey[] = [
  'inquiries',
  'eventsClosed',
  'closeRatePct',
  'revenue',
  'revenuePerEvent',
  'foodCostPct',
  'profitPct',
  'profitPerGuest',
  'pricingAccuracyPts',
  'supplierOverrunPct',
  'partialPricesPct',
  'activeDays'
]
const ok = (value: number): ReportValue => ({ value, enough: true, n: 5 })
const none: ReportValue = { value: null, enough: false, n: 2 }

function report(over: Partial<BusinessReport> = {}): BusinessReport {
  const metrics = (overrides: Partial<Record<ReportMetricKey, ReportValue>> = {}) =>
    Object.fromEntries(KEYS.map((k) => [k, overrides[k] ?? ok(10)])) as Record<ReportMetricKey, ReportValue>
  return {
    months: 3,
    businessName: 'העסק של דנה',
    firstEventAt: 1,
    series: Object.fromEntries(
      KEYS.map((k) => [
        k,
        [
          { month: '2026-09', ...ok(4) },
          { month: '2026-10', ...none }
        ]
      ])
    ) as BusinessReport['series'],
    start: { from: 1, to: 2, metrics: metrics() },
    latest: { from: 3, to: 4, metrics: metrics({ foodCostPct: none, revenue: ok(20) }) },
    comparable: true,
    change: Object.fromEntries(KEYS.map((k) => [k, { changePct: 5, changePts: 2 }])) as BusinessReport['change'],
    baseline: null,
    estimatesOnly: null,
    findings: [{ key: 'below_profit_target', value: 2, evidenceCount: 5 }],
    ...over
  }
}

describe('ReportPage', () => {
  let fixture: ComponentFixture<ReportPage>
  let getReport: jasmine.Spy
  let getFrontDesk: jasmine.Spy
  let query$: BehaviorSubject<ReturnType<typeof convertToParamMap>>

  async function setup(
    result: BusinessReport | HttpErrorResponse,
    query: Record<string, string> = {},
    frontDesk: FrontDeskStats = fdStats(0)
  ): Promise<void> {
    getReport = jasmine
      .createSpy('getReport')
      .and.callFake(() => (result instanceof HttpErrorResponse ? Promise.reject(result) : Promise.resolve(result)))
    getFrontDesk = jasmine.createSpy('getFrontDesk').and.returnValue(Promise.resolve(frontDesk))
    query$ = new BehaviorSubject(convertToParamMap(query))
    TestBed.configureTestingModule({
      imports: [ReportPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, TrendingUp, TrendingDown })],
      providers: [
        provideRouter([]),
        { provide: BusinessStatsService, useValue: { getReport, getFrontDesk } },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error', 'warn'])
        },
        { provide: TranslationService, useValue: { translate: (key: string) => DICTIONARY[key] ?? key } },
        { provide: ActivatedRoute, useValue: { queryParamMap: query$.asObservable() } }
      ]
    })
    fixture = TestBed.createComponent(ReportPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = (id: string) => el().querySelector(`[data-testid="${id}"]`) as HTMLElement | null
  const text = (id: string) => (byId(id)?.textContent ?? '').replace(/\s+/g, ' ').trim()

  it('asks for 6 months by default and 12 when the query says so, passing businessId along', async () => {
    await setup(report(), { months: '12', businessId: 'bX' })
    expect(getReport).toHaveBeenCalledOnceWith(12, 'bX')
  })

  it('shows "no data" for a metric that is not enough and never a number', async () => {
    await setup(report())
    expect(text('latest-foodCostPct')).toBe('אין מספיק נתונים')
    expect(text('start-foodCostPct')).not.toContain('אין מספיק נתונים')
  })

  it('shows no "before FoodVibe" column without a baseline', async () => {
    await setup(report())
    expect(el().textContent).not.toContain('לפני FoodVibe')
    expect(byId('report-estimate')).toBeNull()
  })

  it('shows a baseline estimate with the owner-estimate label', async () => {
    await setup(report({ baseline: { foodCostPct: 32 } }))
    const estimates = el().querySelectorAll('[data-testid="report-estimate"]')
    expect(estimates.length).toBe(1)
    expect(estimates[0].textContent).toContain('הערכת בעל העסק')
    expect(estimates[0].textContent).toContain('32.0%')
  })

  it('shows the start only, with the too-early line, when it is not comparable', async () => {
    await setup(report({ comparable: false }))
    expect(byId('report-too-early')).not.toBeNull()
    expect(byId('latest-inquiries')).toBeNull()
  })

  it('draws a "—" for a month without enough data in the trend, and the findings text', async () => {
    await setup(report())
    expect(text('trend-inquiries')).toContain('—')
    expect(text('finding-below_profit_target')).toContain('2 אירועים נסגרו מתחת ליעד הרווח')
  })

  it('shows the front desk block from the server numbers, in the report range, with the owner estimate', async () => {
    await setup(
      report(),
      { businessId: 'bX' },
      fdStats(5, { baseline: { avgResponseMinutes: { estimate: 30, measured: 12 } } })
    )
    expect(getFrontDesk).toHaveBeenCalledWith(jasmine.objectContaining({ from: '2026-09-01' }), 'bX')
    expect(byId('report-frontdesk')).not.toBeNull()
    expect(text('fd-value-requests')).toBe('5')
    expect(text('fd-value-afterHours')).toBe('25.0%')
    expect(text('fd-value-noShow')).toBe('—')
    expect(text('fd-value-eventsFromRequests')).toBe('2')
    const estimates = el().querySelectorAll('[data-testid="report-fd-estimate"]')
    expect(estimates.length).toBe(1)
    expect(estimates[0].textContent).toContain('הערכת בעל העסק')
    expect(estimates[0].textContent).toContain('30')
  })

  it('does not show the front desk block when the range has no requests', async () => {
    await setup(report())
    expect(byId('report-frontdesk')).toBeNull()
  })

  it('shows the owner-only message on a 403', async () => {
    await setup(new HttpErrorResponse({ status: 403 }))
    expect(text('report-forbidden')).toBe('הדוח זמין לבעל העסק בלבד')
    expect(byId('report-since')).toBeNull()
  })

  it('shows the empty state when there is no event at all', async () => {
    await setup(report({ firstEventAt: null }))
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(byId('report-since')).toBeNull()
  })
})
