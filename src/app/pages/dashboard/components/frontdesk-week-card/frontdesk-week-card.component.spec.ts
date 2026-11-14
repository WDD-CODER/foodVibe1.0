import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { FrontDeskStats } from '@models/frontdesk-stats.model'
import { BusinessService } from '@services/business.service'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { FrontDeskWeekCardComponent } from './frontdesk-week-card.component'

const TEXTS: Record<string, string> = {
  frontdesk_week_requests: 'השבוע התקבלו {{m}} בקשות',
  frontdesk_week_after_hours: '({{k}} מחוץ לשעות הפתיחה)',
  frontdesk_week_decided: 'אישרת {{x}} בחציון של {{y}} דקות.'
}

const stats = (over: Partial<FrontDeskStats> = {}, total = 4): FrontDeskStats => ({
  from: 0,
  to: 0,
  requests: {
    total,
    perDay: total / 7,
    byChannel: { manual: 0, public_form: total, whatsapp: 0 },
    byKind: { table: total, event: 0, tasting: 0, consultation: 0 }
  },
  afterHoursPct: 50,
  outcomes: { approved: 3, declined: 0, expired: 0, cancelled: 0, waiting: 1 },
  declinesByReason: { full: 0, out_of_area: 0, below_minimum: 0, date_taken: 0, other: 0 },
  medianMinutesToDecision: 12.4,
  bookings: { total: 0, noShowRatePct: null, enough: false },
  eventsFromRequests: { count: 0, revenue: 0 },
  baseline: null,
  ...over
})

describe('FrontDeskWeekCardComponent', () => {
  let fixture: ComponentFixture<FrontDeskWeekCardComponent>

  async function setup(week: FrontDeskStats, recent: FrontDeskStats, owner = true): Promise<jasmine.Spy> {
    const getFrontDesk = jasmine
      .createSpy('getFrontDesk')
      .and.callFake((range?: { from?: string }) => Promise.resolve(range?.from ? recent : week))
    TestBed.configureTestingModule({
      imports: [FrontDeskWeekCardComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessStatsService, useValue: { getFrontDesk } },
        { provide: BusinessService, useValue: { business_: signal({ _id: 'b1' }).asReadonly() } },
        { provide: PermissionService, useValue: { isOwner_: signal(owner).asReadonly() } },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn']) },
        { provide: TranslationService, useValue: { translate: (key: string) => TEXTS[key] ?? key } },
        provideRouter([])
      ]
    })
    fixture = TestBed.createComponent(FrontDeskWeekCardComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    return getFrontDesk
  }

  const text = (): string => fixture.nativeElement.textContent as string

  it('renders the sentence from the numbers', async () => {
    await setup(stats(), stats({}, 9))
    expect(fixture.nativeElement.querySelector('[data-testid="frontdesk-week-sentence"]').textContent.trim()).toBe(
      'השבוע התקבלו 4 בקשות (2 מחוץ לשעות הפתיחה). אישרת 3 בחציון של 12 דקות.'
    )
    expect(text()).toContain('frontdesk_week_title')
    expect(fixture.nativeElement.querySelector('a[href="/requests"]')).not.toBeNull()
  })

  it('leaves out the after-hours and median parts when they have no value', async () => {
    await setup(stats({ afterHoursPct: null, medianMinutesToDecision: null }), stats())
    expect(fixture.nativeElement.querySelector('[data-testid="frontdesk-week-sentence"]').textContent.trim()).toBe(
      'השבוע התקבלו 4 בקשות.'
    )
  })

  it('is hidden when the business has no requests at all over 90 days', async () => {
    await setup(stats({}, 0), stats({}, 0))
    expect(fixture.nativeElement.querySelector('[data-testid="frontdesk-week-card"]')).toBeNull()
  })

  it('is shown with zero requests this week when earlier weeks had some', async () => {
    await setup(stats({ afterHoursPct: null }, 0), stats({}, 5))
    expect(fixture.nativeElement.querySelector('[data-testid="frontdesk-week-card"]')).not.toBeNull()
  })

  it('does not load for staff', async () => {
    const spy = await setup(stats(), stats(), false)
    expect(spy).not.toHaveBeenCalled()
    expect(fixture.nativeElement.querySelector('[data-testid="frontdesk-week-card"]')).toBeNull()
  })
})
