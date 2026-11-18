import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { PlatformAdminService } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { PlatformBusinessDialogComponent } from './platform-business-dialog.component'
import { PlatformBusinessDialogService } from './platform-business-dialog.service'

describe('PlatformBusinessDialogComponent (plan 620)', () => {
  let update: jasmine.Spy
  let success: string[]
  let errors: string[]
  let service: PlatformBusinessDialogService
  let result: Promise<boolean>
  let el: HTMLElement
  let component: PlatformBusinessDialogComponent

  function setup(): void {
    success = []
    errors = []
    update = jasmine.createSpy('updatePlatform').and.resolveTo()
    TestBed.configureTestingModule({
      imports: [PlatformBusinessDialogComponent],
      providers: [
        { provide: PlatformAdminService, useValue: { updatePlatform: update } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        {
          provide: UserMsgService,
          useValue: { onSetSuccessMsg: (m: string) => success.push(m), onSetErrorMsg: (m: string) => errors.push(m) }
        },
        { provide: LoggingService, useValue: { error: () => {} } }
      ]
    })
    service = TestBed.inject(PlatformBusinessDialogService)
    result = service.open({
      businessId: 'b1',
      name: 'עסק',
      modules: ['events', 'event_logistics', 'frontdesk', 'ai_create'],
      aiPrivate: false,
      aiMonthlyTokenCap: 500,
      aiTokensThisMonth: 40
    })
    const fixture = TestBed.createComponent(PlatformBusinessDialogComponent)
    fixture.detectChanges()
    el = fixture.nativeElement
    component = fixture.componentInstance
  }

  const api = (): {
    toggleModule(key: string, on: boolean): void
    cap_: { set(v: string): void }
    private_: { set(v: boolean): void }
    reason_: { set(v: string): void }
    reasonError_(): string | null
    capInvalid_(): boolean
    save(): Promise<void>
  } => component as never

  it('sends nothing without a reason of at least 3 characters', async () => {
    setup()
    api().private_.set(true)
    api().reason_.set('ab')
    await api().save()
    expect(update).not.toHaveBeenCalled()
  })

  it('sends only the changed fields with the trimmed reason', async () => {
    setup()
    api().private_.set(true)
    api().reason_.set('  pilot  ')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', { aiPrivate: true, reason: 'pilot' })
    expect(success).toEqual(['platform_fd_saved'])
    expect(await result).toBeTrue()
  })

  it('unticking events also removes event_logistics, in MODULE_KEYS order', async () => {
    setup()
    api().toggleModule('events', false)
    api().reason_.set('no events')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', { modules: ['frontdesk', 'ai_create'], reason: 'no events' })
  })

  it('an emptied cap is sent as null', async () => {
    setup()
    api().cap_.set('')
    api().reason_.set('no cap')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', { aiMonthlyTokenCap: null, reason: 'no cap' })
  })

  it('a cap that is not a whole number sends nothing', async () => {
    setup()
    api().cap_.set('1.5')
    api().reason_.set('bad cap')
    await api().save()
    expect(api().capInvalid_()).toBeTrue()
    expect(update).not.toHaveBeenCalled()
  })

  it('marks the reason field on a 400 and stays open', async () => {
    setup()
    update.and.rejectWith(new HttpErrorResponse({ status: 400 }))
    api().private_.set(true)
    api().reason_.set('xyz')
    await api().save()
    expect(api().reasonError_()).toBe('field_required')
    expect(errors).toEqual([])
    expect(service.isOpen_()).toBeTrue()
  })

  it('toasts save_failed on a 500 and keeps the dialog open', async () => {
    setup()
    update.and.rejectWith(new HttpErrorResponse({ status: 500 }))
    api().private_.set(true)
    api().reason_.set('xyz')
    await api().save()
    expect(errors).toEqual(['save_failed'])
    expect(service.isOpen_()).toBeTrue()
  })

  it('Cancel closes with false and sends no request', async () => {
    setup()
    ;(el.querySelector('[data-testid="biz-cancel"]') as HTMLButtonElement).click()
    expect(await result).toBeFalse()
    expect(update).not.toHaveBeenCalled()
  })
})
