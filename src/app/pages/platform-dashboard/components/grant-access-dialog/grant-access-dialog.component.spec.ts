import { TestBed } from '@angular/core/testing'
import { AccessService } from '@services/access.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { GrantAccessDialogComponent } from './grant-access-dialog.component'
import { GrantAccessDialogService } from './grant-access-dialog.service'

describe('GrantAccessDialogComponent (plan 632)', () => {
  let createGrant: jasmine.Spy
  let success: string[]
  let service: GrantAccessDialogService
  let result: Promise<boolean>
  let el: HTMLElement
  let component: GrantAccessDialogComponent
  let detect: () => void

  function setup(): void {
    success = []
    createGrant = jasmine.createSpy('createGrant').and.resolveTo({ ok: true })
    TestBed.configureTestingModule({
      imports: [GrantAccessDialogComponent],
      providers: [
        { provide: AccessService, useValue: { createGrant } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        { provide: UserMsgService, useValue: { onSetSuccessMsg: (m: string) => success.push(m) } }
      ]
    })
    service = TestBed.inject(GrantAccessDialogService)
    result = service.open({ businessId: 'b1', name: 'Client kitchen' })
    const fixture = TestBed.createComponent(GrantAccessDialogComponent)
    fixture.detectChanges()
    detect = () => fixture.detectChanges()
    el = fixture.nativeElement
    component = fixture.componentInstance
  }

  const api = (): { username_: { set(v: string): void }; save(): Promise<void>; errorKey_(): string | null } =>
    component as never
  const saveBtn = () => el.querySelector('[data-testid="grant-save"]') as HTMLButtonElement

  it('shows the business name and keeps the button disabled while the name is empty', () => {
    setup()
    expect(el.textContent).toContain('Client kitchen')
    expect(saveBtn().getAttribute('aria-disabled')).toBe('true')
    api().username_.set('   ')
    detect()
    expect(saveBtn().getAttribute('aria-disabled')).toBe('true')
    api().username_.set('cons')
    detect()
    expect(saveBtn().getAttribute('aria-disabled')).toBeNull()
  })

  it('sends the trimmed name with the business id, toasts and closes with true', async () => {
    setup()
    api().username_.set('  cons  ')
    await api().save()
    expect(createGrant).toHaveBeenCalledOnceWith('b1', 'cons')
    expect(success).toEqual(['platform_grant_done'])
    expect(await result).toBeTrue()
  })

  it('shows the reason under the field and stays open with the typed name on a failure', async () => {
    setup()
    createGrant.and.resolveTo({ ok: false, errorKey: 'access_err_user_not_found' })
    api().username_.set('nobody')
    await api().save()
    detect()
    expect(api().errorKey_()).toBe('access_err_user_not_found')
    expect(el.querySelector('.c-field-error')?.textContent?.trim()).toBe('access_err_user_not_found')
    expect(service.isOpen_()).toBeTrue()
    expect((el.querySelector('[data-testid="grant-username"]') as HTMLInputElement).value).toBe('nobody')
  })

  it('cancel closes with false and sends nothing', async () => {
    setup()
    ;(el.querySelector('[data-testid="grant-cancel"]') as HTMLButtonElement).click()
    expect(await result).toBeFalse()
    expect(createGrant).not.toHaveBeenCalled()
  })
})
