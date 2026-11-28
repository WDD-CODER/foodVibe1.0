import { HttpErrorResponse } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { History, LucideAngularModule, X } from 'lucide-angular'
import { BusinessService } from '@services/business.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { PlatformAdminService } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { describePlatformChange, PlatformBusinessDialogComponent } from './platform-business-dialog.component'
import { PlatformBusinessDialogService } from './platform-business-dialog.service'

describe('PlatformBusinessDialogComponent (plan 620)', () => {
  let update: jasmine.Spy
  let history: jasmine.Spy
  let erase: jasmine.Spy
  let confirmOpen: jasmine.Spy
  let reload: jasmine.Spy
  let activeBusinessId = 'other'
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
    erase = jasmine.createSpy('eraseLearnedData').and.resolveTo({
      promoted: 1,
      drafts: 2,
      aliasesPulled: 0,
      aliasesDeleted: 0,
      profilesPulled: 0,
      profilesDeleted: 0
    })
    confirmOpen = jasmine.createSpy('open').and.resolveTo(true)
    reload = jasmine.createSpy('reload')
    TestBed.configureTestingModule({
      imports: [PlatformBusinessDialogComponent, LucideAngularModule.pick({ History, X })],
      providers: [
        {
          provide: PlatformAdminService,
          useValue: { updatePlatform: update, getPlatformHistory: history, eraseLearnedData: erase }
        },
        { provide: BusinessService, useValue: { business_: () => ({ _id: activeBusinessId }), reload } },
        { provide: ConfirmModalService, useValue: { open: confirmOpen } },
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

  it('reloads the business after a save for the business the admin is in (plan 646)', async () => {
    activeBusinessId = 'b1'
    setup()
    api().private_.set(true)
    api().reason_.set('pilot')
    await api().save()
    expect(update).toHaveBeenCalled()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload after a save for another business (plan 646)', async () => {
    activeBusinessId = 'other'
    setup()
    api().private_.set(true)
    api().reason_.set('pilot')
    await api().save()
    expect(update).toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

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

  describe('tooltips (plan 644)', () => {
    it('shows no hint text; the private label and the erase button carry tooltips', () => {
      setup()
      // only the screen-reader description (visually hidden) may hold the hint text
      const shown = Array.from(el.querySelectorAll('*')).filter(
        (n) =>
          !n.closest('.visually-hidden') &&
          Array.from(n.childNodes).some(
            (c) => c.nodeType === Node.TEXT_NODE && c.textContent?.includes('platform_ai_private_hint')
          )
      )
      expect(shown.length).toBe(0)
      const label = el.querySelector('[data-testid="biz-private-label"]') as HTMLElement
      expect(label.getAttribute('title')).toBe('platform_ai_private_hint')
      const box = el.querySelector('[data-testid="biz-private"]') as HTMLElement
      const tipId = box.getAttribute('aria-describedby')!
      expect(el.querySelector(`#${tipId}`)?.textContent?.trim()).toBe('platform_ai_private_hint')
      const eraseBtn = el.querySelector('[data-testid="biz-erase-learned"]') as HTMLElement
      expect(eraseBtn.getAttribute('title')).toBe('platform_erase_learned_tip')
      const eraseTip = eraseBtn.getAttribute('aria-describedby')!
      expect(el.querySelector(`#${eraseTip}`)?.textContent?.trim()).toBe('platform_erase_learned_tip')
    })

    it('a history row renders the change in pbd-history__change', async () => {
      setup()
      history.and.resolveTo([{ at: 1, by: 'u', byName: 'D', reason: 'r', changed: ['modules'] }])
      ;(el.querySelector('[data-testid="biz-history-open"]') as HTMLElement).click()
      await new Promise((r) => setTimeout(r))
      fixture.detectChanges()
      expect(el.querySelector('.pbd-history__change')).not.toBeNull()
    })
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
      expect(describePlatformChange({ field: 'learnedData', from: '', to: 'erased' }, t)).toBe(
        'platform_history_learned_erased'
      )
      expect(describePlatformChange({ field: 'zzz', from: '', to: '' }, t)).toBe('zzz')
    })
  })

  describe('erase learned data (plan 639)', () => {
    const q = (id: string): HTMLElement | null => el.querySelector(`[data-testid="${id}"]`)
    const flush = async (): Promise<void> => {
      await new Promise((r) => setTimeout(r))
      fixture.detectChanges()
    }
    const typeReason = (text: string): void => {
      const box = q('biz-erase-reason') as HTMLTextAreaElement
      box.value = text
      box.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    const openBox = (): void => {
      ;(q('biz-erase-learned') as HTMLButtonElement).click()
      fixture.detectChanges()
    }

    it('the erase button opens the reason field; confirm stays disabled while the reason is empty', () => {
      setup()
      expect(q('biz-erase-box')).toBeNull()
      openBox()
      expect(q('biz-erase-box')).not.toBeNull()
      expect(q('biz-erase-confirm')!.getAttribute('aria-disabled')).toBe('true')
      typeReason('   ')
      expect(q('biz-erase-confirm')!.getAttribute('aria-disabled')).toBe('true')
      ;(q('biz-erase-confirm') as HTMLButtonElement).click()
      expect(confirmOpen).not.toHaveBeenCalled()
      typeReason('asked')
      expect(q('biz-erase-confirm')!.getAttribute('aria-disabled')).toBeNull()
    })

    it('confirm opens the popup naming the business; cancel sends nothing', async () => {
      setup()
      confirmOpen.and.resolveTo(false)
      openBox()
      typeReason('asked')
      ;(q('biz-erase-confirm') as HTMLButtonElement).click()
      await flush()
      expect(confirmOpen).toHaveBeenCalledTimes(1)
      expect(confirmOpen.calls.argsFor(0)[0]).toBe('platform_erase_confirm'.replace('{name}', 'עסק'))
      expect(erase).not.toHaveBeenCalled()
    })

    it('confirm with a reason calls the service once and shows the counts text', async () => {
      setup()
      openBox()
      typeReason('  asked  ')
      ;(q('biz-erase-confirm') as HTMLButtonElement).click()
      await flush()
      expect(erase).toHaveBeenCalledOnceWith('b1', 'asked')
      expect(q('biz-erase-done')?.textContent).toContain('platform_erase_done')
      expect(q('biz-erase-failed')).toBeNull()
    })

    it('a failed call shows the error text and the dialog stays usable', async () => {
      setup()
      erase.and.rejectWith(new Error('x'))
      openBox()
      typeReason('asked')
      ;(q('biz-erase-confirm') as HTMLButtonElement).click()
      await flush()
      expect(q('biz-erase-failed')?.textContent).toContain('platform_erase_failed')
      api().private_.set(true)
      api().reason_.set('still works')
      await api().save()
      expect(update).toHaveBeenCalled()
    })

    it('requests the history again after a successful erase when the panel is open', async () => {
      setup()
      ;(q('biz-history-open') as HTMLButtonElement).click()
      await flush()
      expect(history).toHaveBeenCalledTimes(1)
      openBox()
      typeReason('asked')
      ;(q('biz-erase-confirm') as HTMLButtonElement).click()
      await flush()
      expect(history).toHaveBeenCalledTimes(2)
    })
  })
})
