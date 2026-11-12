import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { LucideAngularModule, ChevronDown, Check } from 'lucide-angular'
import { PlatformAdminService } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { FrontDeskAdminDialogComponent } from './front-desk-admin-dialog.component'
import { FrontDeskAdminDialogService } from './front-desk-admin-dialog.service'

describe('FrontDeskAdminDialogComponent (plan 557)', () => {
  let update: jasmine.Spy
  let success: string[]
  let errors: string[]
  let service: FrontDeskAdminDialogService
  let result: Promise<boolean>
  let el: HTMLElement
  let component: FrontDeskAdminDialogComponent

  function setup(): void {
    success = []
    errors = []
    update = jasmine.createSpy('updateFrontDesk').and.resolveTo()
    TestBed.configureTestingModule({
      imports: [FrontDeskAdminDialogComponent, LucideAngularModule.pick({ ChevronDown, Check })],
      providers: [
        { provide: PlatformAdminService, useValue: { updateFrontDesk: update } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        {
          provide: UserMsgService,
          useValue: { onSetSuccessMsg: (m: string) => success.push(m), onSetErrorMsg: (m: string) => errors.push(m) }
        },
        { provide: LoggingService, useValue: { error: () => {} } }
      ]
    })
    service = TestBed.inject(FrontDeskAdminDialogService)
    result = service.open({ businessId: 'b1', name: 'עסק', status: 'draft' })
    const fixture = TestBed.createComponent(FrontDeskAdminDialogComponent)
    fixture.detectChanges()
    el = fixture.nativeElement
    component = fixture.componentInstance
  }

  const api = (): {
    status_: { set(v: string): void }
    reason_: { set(v: string): void }
    save(): Promise<void>
    reasonError_(): string | null
  } => component as never

  it('shows the save button disabled until something changed', () => {
    setup()
    const save = el.querySelector('[data-testid="fd-admin-save"]') as HTMLButtonElement
    expect(save.disabled).toBeTrue()
  })

  it('does not call the server without a reason', async () => {
    setup()
    api().status_.set('pilot')
    await api().save()
    expect(update).not.toHaveBeenCalled()
  })

  it('sends only the changed fields with the reason, toasts and closes with true', async () => {
    setup()
    api().status_.set('pilot')
    api().reason_.set('  start  ')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', { status: 'pilot', reason: 'start' })
    expect(success).toEqual(['platform_fd_saved'])
    expect(await result).toBeTrue()
  })

  it('sends a chosen assistant level and plan', async () => {
    setup()
    ;(component as never as { level_: { set(v: string): void }; plan_: { set(v: string): void } }).level_.set('1')
    ;(component as never as { plan_: { set(v: string): void } }).plan_.set('pilot')
    api().reason_.set('r')
    await api().save()
    expect(update).toHaveBeenCalledOnceWith('b1', { assistantLevel: 1, plan: 'pilot', reason: 'r' })
  })

  it('marks the reason field on a 400', async () => {
    setup()
    update.and.rejectWith(new HttpErrorResponse({ status: 400 }))
    api().status_.set('active')
    api().reason_.set('x')
    await api().save()
    expect(api().reasonError_()).toBe('field_required')
    expect(errors).toEqual([])
  })

  it('toasts save_failed on another error and stays open', async () => {
    setup()
    update.and.rejectWith(new HttpErrorResponse({ status: 500 }))
    api().status_.set('active')
    api().reason_.set('x')
    await api().save()
    expect(errors).toEqual(['save_failed'])
    expect(service.isOpen_()).toBeTrue()
  })

  it('closing with Cancel resolves false', async () => {
    setup()
    ;(el.querySelector('[data-testid="fd-admin-cancel"]') as HTMLButtonElement).click()
    expect(await result).toBeFalse()
  })
})
