import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ClipboardCheck, LucideAngularModule } from 'lucide-angular'
import { BusinessService } from '@services/business.service'
import { BusinessStatsService } from '@services/business-stats.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import type { Business } from '@schemas/entities'
import type { FrontDeskStats } from '@models/frontdesk-stats.model'
import { FrontDeskWeekCardComponent } from './frontdesk-week-card.component'

const BUSINESS = {
  _id: 'b1',
  name: 'x',
  ownerId: 'o1',
  createdAt: 1,
  internal: false,
  lastSyncedMasterVersion: 0
} as Business
const DICTIONARY: Record<string, string> = {
  frontdesk_week_title: 'השבוע בקבלה',
  frontdesk_week_requests: 'השבוע התקבלו {{m}} בקשות',
  frontdesk_week_after_hours: '({{k}} מחוץ לשעות הפתיחה)',
  frontdesk_week_decided: 'אישרת {{x}} בחציון של {{y}} דקות.',
  frontdesk_week_all_requests: 'לכל הבקשות'
}

function stats(total: number, extra: Partial<FrontDeskStats> = {}): FrontDeskStats {
  return {
    from: '2026-11-06',
    to: '2026-11-12',
    requests: {
      total,
      perDay: total / 7,
      byChannel: { manual: 0, public_form: total, whatsapp: 0 },
      byKind: { table: total, event: 0, tasting: 0, consultation: 0 }
    },
    afterHoursPct: null,
    outcomes: { approved: 0, declined: 0, expired: 0, cancelled: 0, waiting: total },
    declinesByReason: { full: 0, out_of_area: 0, below_minimum: 0, date_taken: 0, other: 0 },
    medianMinutesToDecision: null,
    bookings: { total: 0, noShowRatePct: null, enough: false },
    eventsFromRequests: { count: 0, revenue: 0 },
    baseline: null,
    ...extra
  }
}

describe('FrontDeskWeekCardComponent (plan 559)', () => {
  let fixture: ComponentFixture<FrontDeskWeekCardComponent>

  async function setup(week: FrontDeskStats, ninety: FrontDeskStats): Promise<void> {
    const getFrontDesk = jasmine.createSpy('getFrontDesk').and.callFake((range: { from: string; to: string }) => {
      const days = (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000 + 1
      return Promise.resolve(days > 30 ? ninety : week)
    })
    TestBed.configureTestingModule({
      imports: [FrontDeskWeekCardComponent, LucideAngularModule.pick({ ClipboardCheck })],
      providers: [
        { provide: BusinessService, useValue: { business_: signal(BUSINESS).asReadonly() } },
        { provide: BusinessStatsService, useValue: { getFrontDesk } },
        { provide: PermissionService, useValue: { isOwner_: signal(true).asReadonly() } },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn']) },
        { provide: TranslationService, useValue: { translate: (key: string) => DICTIONARY[key] ?? key } },
        provideRouter([])
      ]
    })
    fixture = TestBed.createComponent(FrontDeskWeekCardComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const el = (): HTMLElement => fixture.nativeElement
  const sentence = (): string =>
    el().querySelector('[data-testid="frontdesk-week-sentence"]')?.textContent?.trim() ?? ''

  it('renders the sentence from the numbers, with the after-hours and decision parts', async () => {
    await setup(
      stats(4, {
        afterHoursPct: 50,
        outcomes: { approved: 2, declined: 0, expired: 0, cancelled: 0, waiting: 2 },
        medianMinutesToDecision: 12
      }),
      stats(10)
    )
    expect(el().querySelector('[data-testid="frontdesk-week-card"]')).not.toBeNull()
    expect(sentence()).toBe('השבוע התקבלו 4 בקשות (2 מחוץ לשעות הפתיחה). אישרת 2 בחציון של 12 דקות.')
    expect(el().querySelector('[data-testid="frontdesk-week-link"]')?.getAttribute('href')).toBe('/requests')
  })

  it('leaves out the parts that have no value', async () => {
    await setup(stats(1), stats(1))
    expect(sentence()).toBe('השבוע התקבלו 1 בקשות.')
  })

  it('is hidden when the business has no request in the last 90 days', async () => {
    await setup(stats(0), stats(0))
    expect(el().querySelector('[data-testid="frontdesk-week-card"]')).toBeNull()
  })
})
