import { HttpErrorResponse } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { History, LucideAngularModule, X } from 'lucide-angular'
import { PlatformAdminService } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { describePlatformChange, PlatformBusinessDialogComponent } from './platform-business-dialog.component'
import { PlatformBusinessDialogService } from './platform-business-dialog.service'

describe('PlatformBusinessDialogComponent (plan 620)', () => {
  let update: jasmine.Spy
  let history: jasmine.Spy
  let success: string[]
  let errors: string[]
  let service: PlatformBusinessDialogService
  let result: Promise<boolean>
  let el: HTMLElement
  let component: PlatformBusinessDialogComponent
  let fixture: ComponentFixture<PlatformBusinessDialogComponent>

  function setup(): void {
    success = []
    errors = []
    update = jasmine.createSpy('updatePlatform').and.resolveTo()
    history = jasmine.createSpy('getPlatformHistory').and.resolveTo([])
    TestBed.configureTestingModule({
      imports: [PlatformBusinessDialogComponent, LucideAngularModule.pick({ History, X })],
      providers: [
        { provide: PlatformAdminService, useValue: { updatePlatform: update, getPlatformHistory: history } },
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
    fixture = TestBed.createComponent(PlatformBusinessDialogComponent)
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

  describe('history panel (plan 638)', () => {
    const q = (id: string): HTMLElement | null => el.querySelector(`[data-testid="${id}"]`)
    const click = async (id: string): Promise<void> => {
      ;(q(id) as HTMLElement).click()
      await new Promise((r) => setTimeout(r))
      fixtureDetect()
    }
    function fixtureDetect(): void {
      fixture.detectChanges()
    }
    const rows = [
      {
        at: 2000,
        by: 'u',
        byName: 'Dana',
        reason: 'newer reason',
        changed: ['modules'],
        changes: [{ field: 'aiPrivate', from: 'false', to: 'true' }]
      },
      { at: 1000, by: 'u', byName: 'Old', reason: 'old reason', changed: ['modules', 'aiPrivate'] }
    ]

    it('is closed on open: no panel, no request, and the button carries the tooltip', () => {
      setup()
      expect(q('biz-history')).toBeNull()
      expect(history).not.toHaveBeenCalled()
      const btn = q('biz-history-open') as HTMLButtonElement
      expect(btn.getAttribute('title')).toBe('platform_history_tip')
      expect(btn.getAttribute('aria-label')).toBe('platform_history_tip')
    })

    it('pressing the button shows the panel and requests once; rows render in order', async () => {
      setup()
      history.and.resolveTo(rows)
      await click('biz-history-open')
      expect(q('biz-history')).not.toBeNull()
      expect(history).toHaveBeenCalledOnceWith('b1')
      const items = el.querySelectorAll('[data-testid="biz-history-row"]')
      expect(items.length).toBe(2)
      expect(items[0].textContent).toContain('Dana')
      expect(items[0].textContent).toContain('platform_history_private_on')
      expect(items[0].querySelector('[data-testid="biz-history-reason"]')?.textContent).toContain('newer reason')
      expect(items[1].textContent).toContain('platform_history_field_modules, platform_history_field_aiPrivate')
    })

    it('shows the empty text when there are no rows', async () => {
      setup()
      await click('biz-history-open')
      expect(el.querySelector('app-empty-state')).not.toBeNull()
    })

    it('a failed load shows the error text and the dialog still works', async () => {
      setup()
      history.and.rejectWith(new Error('x'))
      await click('biz-history-open')
      expect(q('biz-history-failed')?.textContent).toContain('platform_history_failed')
      api().private_.set(true)
      api().reason_.set('still works')
      await api().save()
      expect(update).toHaveBeenCalled()
    })

    it('the close button removes the panel, keeps the form, and opening again requests again', async () => {
      setup()
      api().reason_.set('typed')
      await click('biz-history-open')
      await click('biz-history-close')
      expect(q('biz-history')).toBeNull()
      expect((component as never as { reason_(): string }).reason_()).toBe('typed')
      await click('biz-history-open')
      expect(history).toHaveBeenCalledTimes(2)
    })

    it('describePlatformChange words each field and shows an unknown one raw', () => {
      const t = (k: string): string => k
      expect(describePlatformChange({ field: 'modules', from: 'events', to: 'frontdesk' }, t)).toContain(
        'module_frontdesk'
      )
      expect(describePlatformChange({ field: 'aiMonthlyTokenCap', from: '', to: '5000' }, t)).toBe(
        'platform_history_cap_change'
      )
      expect(describePlatformChange({ field: 'aiPrivate', from: 'true', to: 'false' }, t)).toBe(
        'platform_history_private_off'
      )
      expect(describePlatformChange({ field: 'zzz', from: '', to: '' }, t)).toBe('zzz')
    })
  })
})
