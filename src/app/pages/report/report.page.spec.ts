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
  let query$: BehaviorSubject<ReturnType<typeof convertToParamMap>>

  async function setup(result: BusinessReport | HttpErrorResponse, query: Record<string, string> = {}): Promise<void> {
    getReport = jasmine
      .createSpy('getReport')
      .and.callFake(() => (result instanceof HttpErrorResponse ? Promise.reject(result) : Promise.resolve(result)))
    query$ = new BehaviorSubject(convertToParamMap(query))
    TestBed.configureTestingModule({
      imports: [ReportPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, TrendingUp, TrendingDown })],
      providers: [
        provideRouter([]),
        { provide: BusinessStatsService, useValue: { getReport } },
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
