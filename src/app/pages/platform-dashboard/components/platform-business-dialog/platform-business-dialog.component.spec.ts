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

  function setup(cap: number | null = null): void {
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
      aiMonthlyTokenCap: cap,
      aiTokensThisMonth: 1200
    })
    const fixture = TestBed.createComponent(PlatformBusinessDialogComponent)
    fixture.detectChanges()
    el = fixture.nativeElement
    component = fixture.componentInstance
  }

  const api = (): {
    toggleModule(key: string, checked: boolean): void
    cap_: { set(v: string): void }
    private_: { set(v: boolean): void }
    reason_: { set(v: string): void }
    save(): Promise<void>
    reasonError_(): string | null
    isDisabled(key: string): boolean
  } => component as never

  it('shows five module chips and save disabled until something changed', () => {
    setup()
    expect(el.querySelectorAll('[data-testid^="biz-module-"]').length).toBe(5)
    expect((el.querySelector('[data-testid="biz-save"]') as HTMLButtonElement).disabled).toBeTrue()
  })

  it('sends nothing without a reason of at least 3 characters', async () => {
    setup()
    api().toggleModule('frontdesk', false)
    api().reason_.set('ab')
    await api().save()
    expect(update).not.toHaveBeenCalled()
  })

  it('sends only the changed fields with the trimmed reason, toasts and closes with true', async () => {
    setup()
    api().toggleModule('frontdesk', false)
    api().reason_.set('  sold less  ')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', {
      modules: ['events', 'event_logistics', 'ai_create'],
      reason: 'sold less'
    })
    expect(success).toEqual(['platform_fd_saved'])
    expect(await result).toBeTrue()
  })

  it('unticking events also removes event_logistics and disables it', async () => {
    setup()
    api().toggleModule('events', false)
    expect(api().isDisabled('event_logistics')).toBeTrue()
    api().reason_.set('no events')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', { modules: ['frontdesk', 'ai_create'], reason: 'no events' })
  })

  it('an emptied cap is sent as null, a set cap as a number, private as aiPrivate', async () => {
    setup(500)
    api().cap_.set('')
    api().private_.set(true)
    api().reason_.set('abc')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', { aiMonthlyTokenCap: null, aiPrivate: true, reason: 'abc' })
  })

  it('a cap that is not a whole number sends nothing', async () => {
    setup()
    api().cap_.set('1.5')
    api().reason_.set('abc')
    await api().save()
    expect(update).not.toHaveBeenCalled()
  })

  it('marks the reason field on a 400', async () => {
    setup()
    update.and.rejectWith(new HttpErrorResponse({ status: 400 }))
    api().toggleModule('ai_create', false)
    api().reason_.set('abc')
    await api().save()
    expect(api().reasonError_()).toBe('field_required')
    expect(errors).toEqual([])
  })

  it('toasts save_failed on a 500 and stays open with what was typed', async () => {
    setup()
    update.and.rejectWith(new HttpErrorResponse({ status: 500 }))
    api().toggleModule('ai_create', false)
    api().reason_.set('abc')
    await api().save()
    expect(errors).toEqual(['save_failed'])
    expect(service.isOpen_()).toBeTrue()
  })

  it('closing with Cancel resolves false and sends nothing', async () => {
    setup()
    ;(el.querySelector('[data-testid="biz-cancel"]') as HTMLButtonElement).click()
    expect(await result).toBeFalse()
    expect(update).not.toHaveBeenCalled()
  })
})
