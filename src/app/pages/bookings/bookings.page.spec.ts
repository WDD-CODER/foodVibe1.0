import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, input, output, signal } from '@angular/core'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleSlash,
  CircleX,
  ClipboardCheck,
  HelpCircle,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  UserCheck,
  LucideAngularModule
} from 'lucide-angular'
import { addDaysIso, BookingsPage, weekStartIso } from './bookings.page'
import { FloorViewComponent } from './components/floor-view/floor-view.component'
import { ModuleService } from '@services/module.service'
import { BookingDataService } from '@services/booking-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { todayIso } from 'src/app/core/utils/date-input.util'
import type { Booking } from '@models/booking.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const booking = (id: string, status: string, startAt: number, date = todayIso()): Booking =>
  ({
    _id: id,
    kind: 'table',
    status,
    date,
    time: '19:00',
    startAt,
    partySize: 2,
    clientId: 'c1',
    guestName: 'אורח ' + id
  }) as unknown as Booking

describe('BookingsPage (plan 552)', () => {
  let fixture: ComponentFixture<BookingsPage>
  let bookingData: { all_: ReturnType<typeof signal<Booking[]>>; [k: string]: unknown }
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = (): HTMLElement => fixture.nativeElement

  async function setup(list: Booking[]): Promise<void> {
    bookingData = {
      all_: signal(list),
      ensureLoaded: () => Promise.resolve(),
      reloadFromStorage: jasmine.createSpy('reloadFromStorage').and.resolveTo(),
      setStatus: jasmine.createSpy('setStatus').and.resolveTo({ ok: true })
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetWarningMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [
        BookingsPage,
        LucideAngularModule.pick({
          ...TEST_LUCIDE_ICONS,
          Check,
          ChevronLeft,
          ChevronRight,
          CircleCheck,
          CircleSlash,
          CircleX,
          ClipboardCheck,
          HelpCircle,
          MessageCircle,
          Pencil,
          Phone,
          Plus,
          UserCheck
        })
      ],
      providers: [
        provideRouter([]),
        { provide: ModuleService, useValue: { has: () => false } },
        { provide: BookingDataService, useValue: bookingData },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(true) } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(BookingsPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('shows the empty state when the day has no bookings', async () => {
    await setup([])
    expect(el().querySelector('app-empty-state')?.textContent).toContain('bk_empty_day')
  })

  it('offers "seated" on a confirmed booking and calls setStatus', async () => {
    await setup([booking('a', 'confirmed', Date.now() + 3600_000)])
    ;(el().querySelector('[data-testid="bk-seated"]') as HTMLButtonElement).click()
    expect(bookingData['setStatus']).toHaveBeenCalledWith('a', 'seated')
  })

  it('offers no-show only after startAt', async () => {
    await setup([booking('a', 'confirmed', Date.now() + 3600_000)])
    expect(el().querySelector('[data-testid="bk-no-show"]')).toBeNull()
    TestBed.resetTestingModule()
    await setup([booking('a', 'confirmed', Date.now() - 3600_000)])
    expect(el().querySelector('[data-testid="bk-no-show"]')).toBeTruthy()
  })

  it('offers "finished" only on a seated booking', async () => {
    await setup([booking('a', 'seated', Date.now() - 3600_000)])
    expect(el().querySelector('[data-testid="bk-finished"]')).toBeTruthy()
    expect(el().querySelector('[data-testid="bk-seated"]')).toBeNull()
  })

  it('a BAD_STATUS answer shows bk_bad_status and reloads', async () => {
    await setup([booking('a', 'confirmed', Date.now() + 3600_000)])
    ;(bookingData['setStatus'] as jasmine.Spy).and.resolveTo({ ok: false, code: 'BAD_STATUS' })
    ;(el().querySelector('[data-testid="bk-seated"]') as HTMLButtonElement).click()
    await fixture.whenStable()
    expect(userMsg.onSetWarningMsg).toHaveBeenCalledWith('bk_bad_status')
    expect(bookingData['reloadFromStorage']).toHaveBeenCalled()
  })

  it('works the Sunday-first week out', () => {
    expect(weekStartIso('2026-11-12')).toBe('2026-11-08')
    expect(addDaysIso('2026-11-30', 1)).toBe('2026-12-01')
  })
})

@Component({ selector: 'app-floor-view', standalone: true, template: '<p data-testid="floor-stub"></p>' })
class FloorViewStub {
  readonly date = input.required<string>()
  readonly at = input<string | null>(null)
  readonly atChange = output<string | null>()
}

describe('BookingsPage floor view (plan 671)', () => {
  async function open(query: Record<string, string>, tables: boolean): Promise<HTMLElement> {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    const params = convertToParamMap(query)
    TestBed.configureTestingModule({
      imports: [
        BookingsPage,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ChevronLeft, ChevronRight, ClipboardCheck })
      ],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(params), snapshot: { queryParamMap: params } } },
        { provide: ModuleService, useValue: { has: () => tables } },
        { provide: BookingDataService, useValue: { all_: signal([]), ensureLoaded: () => Promise.resolve() } },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(true) } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: {} }
      ]
    })
    TestBed.overrideComponent(BookingsPage, {
      remove: { imports: [FloorViewComponent] },
      add: { imports: [FloorViewStub] }
    })
    const fixture = TestBed.createComponent(BookingsPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    return fixture.nativeElement
  }

  it('without the module there is no floor tab and ?view=floor shows the day view', async () => {
    const el = await open({ view: 'floor' }, false)
    expect(el.querySelectorAll('[role="tab"]').length).toBe(2)
    expect(el.textContent).not.toContain('bk_view_floor')
    expect(el.querySelector('[data-testid="floor-stub"]')).toBeNull()
    expect(el.querySelector('app-empty-state')?.textContent).toContain('bk_empty_day')
  })

  it('with the module the floor tab is offered and ?view=floor shows the room', async () => {
    const el = await open({ view: 'floor' }, true)
    expect(el.querySelectorAll('[role="tab"]').length).toBe(3)
    expect(el.querySelector('[data-testid="floor-stub"]')).toBeTruthy()
  })

  it('the default view is the room with the module and the day without it', async () => {
    expect((await open({}, true)).querySelector('[data-testid="floor-stub"]')).toBeTruthy()
    TestBed.resetTestingModule()
    expect((await open({}, false)).querySelector('[data-testid="floor-stub"]')).toBeNull()
  })

  it('?view=day still opens the day view for a business with tables', async () => {
    const el = await open({ view: 'day' }, true)
    expect(el.querySelector('[data-testid="floor-stub"]')).toBeNull()
  })
})
