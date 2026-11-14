import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { ClipboardCheck, LucideAngularModule, MessageCircle, Phone } from 'lucide-angular'
import { PublicRequestStatusPage } from './public-request-status.page'
import { PublicRequestService, type PublicRequestStatus, type StatusResult } from '../services/public-request.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const status = (over: Partial<PublicRequestStatus> = {}): PublicRequestStatus => ({
  reference: 'ABCD1234',
  kind: 'table',
  status: 'qualified',
  wanted: { date: '2030-01-01', partySize: 4 },
  guestName: 'דנה',
  createdAt: 1,
  displayName: 'הבית',
  phone: '03-1234567',
  ...over
})

describe('PublicRequestStatusPage (plan 555)', () => {
  let fixture: ComponentFixture<PublicRequestStatusPage>
  let api: { getStatus: jasmine.Spy; cancel: jasmine.Spy }
  let confirm: { open: jasmine.Spy }
  const el = (): HTMLElement => fixture.nativeElement
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setup(first: StatusResult, confirmed = true): Promise<void> {
    api = {
      getStatus: jasmine.createSpy('getStatus').and.resolveTo(first),
      cancel: jasmine.createSpy('cancel').and.resolveTo({ ok: true, status: status({ status: 'cancelled' }) })
    }
    confirm = { open: jasmine.createSpy('open').and.resolveTo(confirmed) }
    TestBed.configureTestingModule({
      imports: [
        PublicRequestStatusPage,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ClipboardCheck, MessageCircle, Phone })
      ],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'my-place', token: 'T'.repeat(32) }) } }
        },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        },
        { provide: ConfirmModalService, useValue: confirm }
      ]
    })
    TestBed.overrideComponent(PublicRequestStatusPage, {
      set: { providers: [{ provide: PublicRequestService, useValue: api }] }
    })
    fixture = TestBed.createComponent(PublicRequestStatusPage)
    await settle()
  }

  it('a waiting request shows the waiting status and the cancel button', async () => {
    await setup({ ok: true, status: status() })
    expect(el().querySelector('[data-testid="pb-status-text"]')?.textContent).toContain('pb_status_waiting')
    expect(el().querySelector('[data-testid="pb-cancel"]')).toBeTruthy()
    expect(el().textContent).toContain('pb_powered_by')
  })

  it('cancel asks first, then shows the cancelled status without the button', async () => {
    await setup({ ok: true, status: status() })
    ;(el().querySelector('[data-testid="pb-cancel"]') as HTMLButtonElement).click()
    await settle()
    expect(confirm.open).toHaveBeenCalledWith('pb_cancel_confirm')
    expect(api.cancel).toHaveBeenCalledTimes(1)
    expect(el().querySelector('[data-testid="pb-status-text"]')?.textContent).toContain('pb_status_cancelled')
    expect(el().querySelector('[data-testid="pb-cancel"]')).toBeNull()
  })

  it('a declined confirm cancels nothing', async () => {
    await setup({ ok: true, status: status() }, false)
    ;(el().querySelector('[data-testid="pb-cancel"]') as HTMLButtonElement).click()
    await settle()
    expect(api.cancel).not.toHaveBeenCalled()
  })

  it('409 reloads the status', async () => {
    await setup({ ok: true, status: status() })
    api.cancel.and.resolveTo({ ok: false, code: 'ALREADY_DECIDED' })
    api.getStatus.and.resolveTo({
      ok: true,
      status: status({
        status: 'approved',
        booking: { date: '2030-01-01', time: '19:00', partySize: 4, status: 'confirmed' }
      })
    })
    ;(el().querySelector('[data-testid="pb-cancel"]') as HTMLButtonElement).click()
    await settle()
    expect(api.getStatus).toHaveBeenCalledTimes(2)
    expect(el().querySelector('[data-testid="pb-status-text"]')?.textContent).toContain('pb_status_approved')
    expect(el().querySelector('[data-testid="pb-booking"]')?.textContent).toContain('19:00')
    expect(el().querySelector('[data-testid="pb-cancel"]')).toBeNull()
  })

  it('not found shows the not-found message', async () => {
    await setup({ ok: false, code: 'NOT_FOUND' })
    expect(el().textContent).toContain('pb_request_not_found')
  })
})
