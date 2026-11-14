import { ComponentFixture, TestBed } from '@angular/core/testing'
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
import { RequestCardComponent, type ApproveEdit } from './request-card.component'
import { TranslationService } from '@services/translation.service'
import type { FrontDeskRequest } from '@models/request.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const request = (extra: Partial<FrontDeskRequest> = {}): FrontDeskRequest =>
  ({
    _id: 'r1',
    kind: 'table',
    status: 'qualified',
    channel: 'manual',
    clientId: 'c1',
    guestName: 'דנה',
    guestPhone: '052-123 4567',
    wanted: { date: '2030-05-01', time: '19:00', partySize: 4 },
    answers: [{ questionKey: 'occasion', label: 'סיבה', value: 'יום הולדת' }],
    qualification: { verdict: 'borderline', reasons: ['fd_reason_party_too_large|max=12'], by: 'rules' },
    statusHistory: [{ status: 'new', at: 1000, by: 'u', byName: 'u', via: 'member' }],
    createdAt: 1000,
    updatedAt: 1000,
    ...extra
  }) as unknown as FrontDeskRequest

describe('RequestCardComponent (plan 552)', () => {
  let fixture: ComponentFixture<RequestCardComponent>
  const el = (): HTMLElement => fixture.nativeElement
  type Internals = { editing_: { (): boolean }; startEdit: () => void; editParty_: { set: (n: number) => void } }

  function setup(r: FrontDeskRequest, dayLoad: unknown = null): void {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [
        RequestCardComponent,
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
      providers: [provideRouter([]), { provide: TranslationService, useValue: translation }]
    })
    fixture = TestBed.createComponent(RequestCardComponent)
    fixture.componentRef.setInput('request', r)
    fixture.componentRef.setInput('dayLoad', dayLoad)
    fixture.detectChanges()
  }

  it('shows the name, the wanted line, the verdict with its reason and the answers as text', () => {
    setup(request())
    expect(el().textContent).toContain('דנה')
    expect(el().querySelector('[data-testid="request-wanted"]')?.textContent).toContain('01/05/2030 · 19:00')
    expect(el().querySelector('[data-testid="request-verdict"]')?.textContent).toContain('rq_verdict_borderline')
    expect(el().querySelector('.rq-reasons')?.textContent).toContain('fd_reason_party_too_large')
    expect(el().textContent).toContain('יום הולדת')
  })

  it('builds the call and WhatsApp links from the phone', () => {
    setup(request())
    const hrefs = Array.from(el().querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('tel:052-123 4567')
    expect(hrefs).toContain('https://wa.me/972521234567')
  })

  it('shows the day strip for a table and not for an event', () => {
    setup(request(), { bookings: [], coversByHour: { '19': 6 } })
    expect(el().querySelector('app-day-load-strip')).toBeTruthy()
    TestBed.resetTestingModule()
    setup(request({ kind: 'event', wanted: { date: '2030-05-01' } }))
    expect(el().querySelector('app-day-load-strip')).toBeNull()
  })

  it('approves with no edits as null', () => {
    setup(request())
    let got: ApproveEdit | undefined
    fixture.componentInstance.approve.subscribe((v) => (got = v))
    ;(el().querySelector('[data-testid="request-approve"]') as HTMLButtonElement).click()
    expect(got).toBeNull()
  })

  it('approves after an edit with the changed values, and Escape leaves edit mode', () => {
    setup(request())
    const cmp = fixture.componentInstance as unknown as Internals
    let got: ApproveEdit | undefined
    fixture.componentInstance.approve.subscribe((v) => (got = v))
    cmp.startEdit()
    cmp.editParty_.set(6)
    fixture.detectChanges()
    ;(el().querySelector('[data-testid="request-approve"]') as HTMLButtonElement).click()
    expect(got).toEqual({ wanted: { date: '2030-05-01', time: '19:00', partySize: 6 } })
    cmp.startEdit()
    fixture.detectChanges()
    el()
      .querySelector('.rq-edit')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(cmp.editing_()).toBeFalse()
  })

  it('disables the three buttons while busy and hides Ask once the request needs info', () => {
    setup(request({ status: 'needs_info' }))
    fixture.componentRef.setInput('busy', true)
    fixture.detectChanges()
    expect((el().querySelector('[data-testid="request-approve"]') as HTMLButtonElement).disabled).toBeTrue()
    expect(el().querySelector('[data-testid="request-ask"]')).toBeNull()
  })

  it('links an approved event to its inquiry and shows a decline reason', () => {
    setup(request({ kind: 'event', status: 'approved', outcome: { type: 'menuEvent', id: 'e1' } }))
    expect(el().querySelector('[data-testid="open-event"]')?.getAttribute('href')).toBe('/menu-intelligence/e1')
    TestBed.resetTestingModule()
    setup(request({ status: 'declined', decline: { reason: 'date_taken', text: 'מלא', at: 1, by: 'u' } }))
    expect(el().querySelector('[data-testid="request-decline-line"]')?.textContent).toContain(
      'rq_reason_date_taken — מלא'
    )
  })
})
