import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule, TrendingDown, TrendingUp } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'
import type { BusinessStats, BusinessStatsCards } from '@models/business-stats.model'
import { BusinessPerformanceComponent } from './business-performance.component'

const DICTIONARY: Record<string, string> = {
  stat_vs_before: '{{pct}} מול לפני',
  stat_no_baseline: 'אין נתוני פתיחה',
  stat_accuracy_value: '{{pts}} נקודה בממוצע',
  stat_accuracy_empty: 'יופיע אחרי סגירת אירוע ראשון',
  stat_avg_actual_profit: 'רווח בפועל ממוצע {{pct}}',
  stat_close_rate: 'אחוז סגירה',
  stat_points_short: 'נק׳',
  create_first_inquiry: 'צור פנייה ראשונה',
  event_legacy: 'ישן'
}

const STAGES = ['inquiry', 'quote_sent', 'deposit_paid', 'ordering', 'execution', 'post_production'] as const

function cards(over: Partial<BusinessStatsCards> = {}): BusinessStatsCards {
  return {
    inquiries: { value: 10, monthly: 10, baseline: 6, changePct: 66.67 },
    closed: { value: 4, notClosed: 3, closeRatePct: 57.14, monthly: 4, baseline: 3, changePct: 33.33 },
    revenue: { value: 48000, monthly: 48000, baseline: 36000, changePct: 33.33 },
    accuracy: {
      finishedCount: 2,
      avgAccuracyPts: -1,
      avgActualProfitPct: 49,
      baselineEstProfitPct: 50,
      vsBaselinePts: -1
    },
    usage: { activeDays: 3, perWeek: 0.7 },
    ...over
  }
}

function stats(over: Partial<BusinessStats> = {}): BusinessStats {
  return {
    period: '30',
    periodDays: 30,
    hasBaseline: true,
    cards: cards(),
    funnel: STAGES.map((stage, i) => ({ stage, count: i === 0 ? 2 : 0 })),
    upcoming: [
      { _id: 'e1', name: 'חתונה', eventDate: '2026-11-03', guestCount: 80, stage: 'quote_sent', legacy: false },
      { _id: 'e2', name: 'בר מצווה', eventDate: '2026-11-05', guestCount: null, stage: 'inquiry', legacy: true }
    ],
    ...over
  }
}

describe('BusinessPerformanceComponent', () => {
  let fixture: ComponentFixture<BusinessPerformanceComponent>
  let get: jasmine.Spy
  let navigate: jasmine.Spy
  let logging: jasmine.SpyObj<LoggingService>
  let userMsg: jasmine.SpyObj<UserMsgService>

  async function setup(result: BusinessStats | Error, loggedIn = true): Promise<void> {
    get = jasmine
      .createSpy('get')
      .and.callFake(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)))
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['error', 'warn'])
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
    TestBed.configureTestingModule({
      imports: [
        BusinessPerformanceComponent,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, TrendingUp, TrendingDown })
      ],
      providers: [
        { provide: BusinessStatsService, useValue: { get } },
        { provide: LoggingService, useValue: logging },
        { provide: UserMsgService, useValue: userMsg },
        { provide: UserService, useValue: { isLoggedIn: () => loggedIn } },
        {
          provide: TranslationService,
          useValue: { translate: (key: string) => DICTIONARY[key] ?? key }
        },
        provideRouter([])
      ]
    })
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(BusinessPerformanceComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = (id: string) => el().querySelector(`[data-testid="${id}"]`) as HTMLElement | null
  const text = (id: string) => (byId(id)?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const changeOf = (card: string) =>
    (byId(`stat-${card}`)?.querySelector('[data-testid="stat-change"]')?.textContent ?? '').replace(/\s+/g, ' ').trim()

  it('asks for 30 days first and shows five cards', async () => {
    await setup(stats())
    expect(get).toHaveBeenCalledOnceWith('30')
    for (const key of ['inquiries', 'closed', 'revenue', 'accuracy', 'usage'])
      expect(byId(`stat-${key}`)).not.toBeNull()
  })

  it('writes a rise against the opening baseline with a plus', async () => {
    await setup(stats())
    expect(changeOf('inquiries')).toBe('+67% מול לפני')
  })

  it('writes a fall with a real minus', async () => {
    await setup(
      stats({
        cards: cards({
          closed: { value: 2, notClosed: 3, closeRatePct: 40, monthly: 2, baseline: 3, changePct: -33.33 }
        })
      })
    )
    expect(changeOf('closed')).toBe('−33% מול לפני')
    expect(byId('stat-closed')!.querySelector('.is-bad')).not.toBeNull()
  })

  it('colours a rise good and a fall bad', async () => {
    await setup(stats())
    expect(byId('stat-revenue')!.querySelector('.is-good')).not.toBeNull()
  })

  it('says there are no opening numbers when the business has no baseline', async () => {
    const empty = cards({
      inquiries: { value: 10, monthly: 10, baseline: null, changePct: null },
      closed: { value: 4, notClosed: 3, closeRatePct: 57.14, monthly: 4, baseline: null, changePct: null },
      revenue: { value: 48000, monthly: 48000, baseline: null, changePct: null }
    })
    await setup(stats({ hasBaseline: false, cards: empty }))
    expect(changeOf('inquiries')).toBe('אין נתוני פתיחה')
    expect(changeOf('closed')).toBe('אין נתוני פתיחה')
    expect(changeOf('revenue')).toBe('אין נתוני פתיחה')
  })

  it('shows accuracy in points and the close rate', async () => {
    await setup(stats())
    expect(text('stat-accuracy')).toContain('−1 נקודה בממוצע')
    expect(text('stat-accuracy')).toContain('−1 נק׳ מול לפני')
    expect(text('stat-closed')).toContain('אחוז סגירה 57%')
  })

  it('shows a dash and the hint until the first event is finished', async () => {
    const none = cards({
      accuracy: {
        finishedCount: 0,
        avgAccuracyPts: null,
        avgActualProfitPct: null,
        baselineEstProfitPct: 50,
        vsBaselinePts: null
      }
    })
    await setup(stats({ cards: none }))
    const card = byId('stat-accuracy')!
    expect(card.querySelector('[data-testid="stat-value"]')!.textContent!.trim()).toBe('—')
    expect(card.querySelector('[data-testid="stat-note"]')!.textContent!.trim()).toBe('יופיע אחרי סגירת אירוע ראשון')
    expect(card.querySelector('[data-testid="stat-change"]')).toBeNull()
  })

  it('shows days of use per week with one decimal', async () => {
    await setup(stats())
    expect(byId('stat-usage')!.querySelector('[data-testid="stat-value"]')!.textContent!.trim()).toBe('0.7')
  })

  it('shows no money cards and no period picker when the answer has no cards (staff)', async () => {
    await setup(stats({ cards: undefined }))
    expect(el().querySelectorAll('[data-testid^="stat-"]').length).toBe(0)
    expect(byId('period-30')).toBeNull()
    expect(byId('funnel')).not.toBeNull()
    expect(byId('upcoming')).not.toBeNull()
  })

  it('opens the library on the stage when a funnel bar is clicked', async () => {
    await setup(stats())
    byId('funnel-inquiry')!.click()
    expect(navigate).toHaveBeenCalledWith(['/menu-library'], { queryParams: { stage: 'inquiry' } })
  })

  it('lists the upcoming events with date, guests, stage and the legacy tag', async () => {
    await setup(stats())
    const rows = el().querySelectorAll('[data-testid="upcoming-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('03/11')
    expect(rows[0].textContent).toContain('80')
    expect(rows[0].textContent).toContain('event_stage_quote_sent')
    expect(rows[1].textContent).toContain('ישן')
    ;(rows[0] as HTMLElement).click()
    expect(navigate).toHaveBeenCalledWith(['/menu-intelligence', 'e1'])
  })

  it('says so when no event is coming up', async () => {
    await setup(stats({ upcoming: [] }))
    expect(byId('upcoming-empty')).not.toBeNull()
  })

  it('offers the first inquiry to a business with nothing yet', async () => {
    const zero = cards({
      inquiries: { value: 0, monthly: 0, baseline: null, changePct: null },
      closed: { value: 0, notClosed: 0, closeRatePct: null, monthly: 0, baseline: null, changePct: null },
      revenue: { value: 0, monthly: 0, baseline: null, changePct: null }
    })
    await setup(stats({ cards: zero, funnel: STAGES.map((stage) => ({ stage, count: 0 })), upcoming: [] }))
    byId('create-first-inquiry')!.click()
    expect(navigate).toHaveBeenCalledWith(['/menu-library'], { queryParams: { new: 'inquiry' } })
  })

  it('does not offer the first inquiry when there are events', async () => {
    await setup(stats())
    expect(byId('create-first-inquiry')).toBeNull()
  })

  it('asks again when another period is picked', async () => {
    await setup(stats())
    const radio = byId('period-90')!.querySelector('input')!
    radio.click()
    fixture.detectChanges()
    await fixture.whenStable()
    expect(get).toHaveBeenCalledWith('90')
    byId('period-all')!.querySelector('input')!.click()
    fixture.detectChanges()
    await fixture.whenStable()
    expect(get).toHaveBeenCalledWith('all')
  })

  it('reports a failed load with a log entry and a message', async () => {
    await setup(new Error('boom'))
    expect(logging.error).toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('save_failed')
  })

  it('does not ask the server when nobody is signed in', async () => {
    await setup(stats(), false)
    expect(get).not.toHaveBeenCalled()
  })
})
