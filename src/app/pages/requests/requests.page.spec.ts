import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
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
import { RequestsPage } from './requests.page'
import { BookingDataService } from '@services/booking-data.service'
import { FrontDeskBadgeService } from '@services/front-desk-badge.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { FrontDeskRequest } from '@models/request.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const NOW = Date.now()
const req = (id: string, status: string, extra: Partial<FrontDeskRequest> = {}): FrontDeskRequest =>
  ({
    _id: id,
    kind: 'table',
    status,
    channel: 'manual',
    clientId: 'c1',
    guestName: 'שם ' + id,
    guestPhone: '0521234567',
    wanted: { date: '2030-05-01', time: '19:00', partySize: 4 },
    answers: [],
    statusHistory: [{ status: 'new', at: NOW - 1000, by: 'u', byName: 'u', via: 'member' }],
    createdAt: NOW - 1000,
    updatedAt: NOW - 1000,
    ...extra
  }) as unknown as FrontDeskRequest

describe('RequestsPage (plan 552)', () => {
  let fixture: ComponentFixture<RequestsPage>
  let items_: WritableSignal<FrontDeskRequest[]>
  let data: Record<string, jasmine.Spy | WritableSignal<FrontDeskRequest[]>>
  let calls: string[]
  let userMsg: jasmine.SpyObj<UserMsgService>
  let badge: { refresh: jasmine.Spy; waitingCount_: WritableSignal<number> }
  let bookings: { day: jasmine.Spy }

  type Internals = {
    waiting_: () => FrontDeskRequest[]
    onApprove: (r: FrontDeskRequest, edit: { wanted: FrontDeskRequest['wanted'] } | null) => Promise<void>
    onDecline: (c: { reason: string; text?: string }) => Promise<void>
    declineFor_: WritableSignal<FrontDeskRequest | null>
  }
  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const el = (): HTMLElement => fixture.nativeElement

  async function setup(list: FrontDeskRequest[]): Promise<void> {
    items_ = signal(list)
    calls = []
    const ok = (name: string) =>
      jasmine.createSpy(name).and.callFake(async () => {
        calls.push(name)
        return { ok: true, request: list[0], outcome: {} }
      })
    data = {
      all_: items_,
      updateWanted: ok('updateWanted'),
      approve: ok('approve'),
      decline: ok('decline'),
      setStatus: ok('setStatus')
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetSuccessMsg',
      'onSetErrorMsg',
      'onSetWarningMsg'
    ])
    badge = { refresh: jasmine.createSpy('refresh').and.resolveTo(), waitingCount_: signal(0) }
    bookings = { day: jasmine.createSpy('day').and.resolveTo({ bookings: [], coversByHour: { '19': 6 } }) }
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [
        RequestsPage,
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
        { provide: RequestDataService, useValue: data },
        { provide: BookingDataService, useValue: bookings },
        { provide: FrontDeskBadgeService, useValue: badge },
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_: signal(null), ensureLoaded: () => Promise.resolve() }
        },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(RequestsPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('the waiting tab holds new, qualified and needs_info, oldest first', async () => {
    await setup([
      req('a', 'new', { statusHistory: [{ status: 'new', at: NOW - 10, by: 'u', byName: 'u', via: 'member' }] }),
      req('b', 'qualified', { statusHistory: [{ status: 'new', at: NOW - 500, by: 'u', byName: 'u', via: 'member' }] }),
      req('c', 'needs_info'),
      req('d', 'approved'),
      req('e', 'declined')
    ])
    expect(
      cmp()
        .waiting_()
        .map((r) => r._id)
    ).toEqual(['c', 'b', 'a'])
    expect(el().querySelectorAll('app-request-card').length).toBe(3)
  })

  it('approve without edits calls approve once and not updateWanted', async () => {
    await setup([req('a', 'qualified')])
    await cmp().onApprove(items_()[0], null)
    expect(calls).toEqual(['approve'])
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('rq_approved')
  })

  it('approve after an edit calls updateWanted and then approve', async () => {
    await setup([req('a', 'qualified')])
    await cmp().onApprove(items_()[0], { wanted: { date: '2030-05-02', time: '19:00', partySize: 4 } })
    expect(calls).toEqual(['updateWanted', 'approve'])
  })

  it('a 409 ALREADY_DECIDED shows rq_already_decided and reloads', async () => {
    await setup([req('a', 'qualified')])
    ;(data['approve'] as jasmine.Spy).and.resolveTo({ ok: false, code: 'ALREADY_DECIDED' })
    badge.refresh.calls.reset()
    await cmp().onApprove(items_()[0], null)
    expect(userMsg.onSetWarningMsg).toHaveBeenCalledWith('rq_already_decided')
    expect(badge.refresh).toHaveBeenCalledWith(true)
  })

  it('another failure shows rq_decision_failed and nothing reloads', async () => {
    await setup([req('a', 'qualified')])
    ;(data['approve'] as jasmine.Spy).and.resolveTo({ ok: false, code: null })
    badge.refresh.calls.reset()
    await cmp().onApprove(items_()[0], null)
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('rq_decision_failed')
    expect(badge.refresh).not.toHaveBeenCalled()
  })

  it('decline sends the chosen reason and text', async () => {
    await setup([req('a', 'qualified')])
    cmp().declineFor_.set(items_()[0])
    await cmp().onDecline({ reason: 'date_taken', text: 'מלא' })
    expect(data['decline']).toHaveBeenCalledWith('a', 'date_taken', 'מלא')
    expect(cmp().declineFor_()).toBeNull()
  })

  it('loads the day once per date, for a table but not for an event', async () => {
    await setup([
      req('a', 'qualified'),
      req('b', 'new'),
      req('c', 'new', { kind: 'event', wanted: { date: '2031-01-01' } })
    ])
    expect(bookings.day).toHaveBeenCalledTimes(1)
    expect(bookings.day).toHaveBeenCalledWith('2030-05-01')
    expect(el().querySelectorAll('app-day-load-strip').length).toBe(2)
  })

  it('shows the empty state for an empty tab', async () => {
    await setup([])
    expect(el().querySelector('app-empty-state')?.textContent).toContain('rq_empty_waiting')
  })
})
