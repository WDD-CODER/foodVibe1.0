import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { of, throwError } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { UserManagementComponent } from './user-management.component'
import { UserAdminService } from '@services/user-admin.service'
import { UserService } from '@services/user.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import type { AdminUser } from '@models/admin-user.model'

const OWNER: AdminUser = {
  _id: 'o1',
  name: 'dana',
  email: 'd@x',
  businessId: 'b1',
  businessName: 'מטבח בדיקה',
  businessRole: 'owner'
}
const STAFF: AdminUser = {
  _id: 's1',
  name: 'sam',
  email: 's@x',
  businessId: 'b1',
  businessName: 'מטבח בדיקה',
  businessRole: 'staff'
}
const MINE: AdminUser = {
  _id: 'g1',
  name: 'guest',
  email: 'g@x',
  businessId: 'bg',
  businessName: 'העסק שלי',
  businessRole: 'owner',
  isPlatformAdmin: true
}

describe('UserManagementComponent', () => {
  let fixture: ComponentFixture<UserManagementComponent>
  let component: UserManagementComponent
  let admin: jasmine.SpyObj<UserAdminService>
  let confirm: jasmine.SpyObj<ConfirmModalService>
  let msg: jasmine.SpyObj<UserMsgService>

  beforeEach(async () => {
    admin = jasmine.createSpyObj<UserAdminService>('UserAdminService', ['getUsers', 'deleteUser', 'setAiAllowance'])
    admin.getUsers.and.returnValue(of([MINE, OWNER, STAFF]))
    admin.deleteUser.and.returnValue(of({ ok: true, deletedBusiness: true, usersDeleted: 2 }))
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open', 'openTernary'])
    confirm.open.and.resolveTo(true)
    confirm.openTernary.and.resolveTo('confirm')
    msg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])

    await TestBed.configureTestingModule({
      imports: [UserManagementComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: UserAdminService, useValue: admin },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: UserMsgService, useValue: msg },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        {
          provide: UserService,
          useValue: {
            isPlatformAdmin_: signal(true),
            user_: signal({ _id: 'g1', name: 'guest', email: 'g@x', businessId: 'bg', isPlatformAdmin: true })
          }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(UserManagementComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('lists business name and role chip per row', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? ''
    expect(text).toContain('מטבח בדיקה')
    expect(text).toContain('business_role_owner')
    expect(text).toContain('business_role_staff')
  })

  it('the platform admin chip names itself with the shared tooltip, not the browser title', () => {
    const chip = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-testid="platform-admin-chip"]'
    )!
    expect(chip.getAttribute('title')).toBeNull()
    expect(chip.getAttribute('aria-label')).toBe('platform_admin')
    chip.dispatchEvent(new FocusEvent('focusin'))
    expect(document.body.querySelector('.c-tooltip')?.textContent).toContain('platform_admin')
    chip.dispatchEvent(new FocusEvent('focusout'))
    expect(document.body.querySelector('.c-tooltip')).toBeNull()
  })

  it('deleting an owner asks, then the learned-data question, then the final confirm; keep deletes with false', async () => {
    await component.onDeleteUser(OWNER)
    expect(confirm.open).toHaveBeenCalledTimes(2)
    expect(confirm.open.calls.argsFor(0)[0]).toContain('delete_business_confirm')
    expect(confirm.openTernary).toHaveBeenCalledOnceWith('delete_business_learned_question', {
      variant: 'danger',
      saveLabel: 'delete_business_learned_keep',
      saveButtonLabel: 'delete_business_learned_erase'
    })
    expect(confirm.open.calls.argsFor(1)[0]).toBe('delete_business_confirm_final')
    expect(admin.deleteUser).toHaveBeenCalledOnceWith('o1', false)
    expect(msg.onSetSuccessMsg).toHaveBeenCalledWith('business_deleted')
  })

  it('"erase it too" adds the note to the final confirm and deletes with true', async () => {
    confirm.openTernary.and.resolveTo('save')
    await component.onDeleteUser(OWNER)
    expect(confirm.open.calls.argsFor(1)[0]).toBe('delete_business_confirm_final delete_business_learned_erase_note')
    expect(admin.deleteUser).toHaveBeenCalledOnceWith('o1', true)
  })

  it('cancel at the learned-data question deletes nothing and skips the final confirm', async () => {
    confirm.openTernary.and.resolveTo('cancel')
    await component.onDeleteUser(OWNER)
    expect(confirm.open).toHaveBeenCalledTimes(1)
    expect(admin.deleteUser).not.toHaveBeenCalled()
  })

  it('the second question for an owner asks for the business name', async () => {
    await component.onDeleteUser(OWNER)
    expect(confirm.open.calls.argsFor(1)[1]?.typedConfirm).toEqual({
      expected: 'מטבח בדיקה',
      labelKey: 'delete_business_type_name'
    })
    expect(confirm.open.calls.argsFor(0)[1]?.typedConfirm).toBeUndefined()
  })

  it('falls back to the user name when the business name is missing or blank', async () => {
    await component.onDeleteUser({ ...OWNER, businessName: undefined })
    await component.onDeleteUser({ ...OWNER, businessName: '   ' })
    expect(confirm.open.calls.argsFor(1)[1]?.typedConfirm?.expected).toBe('dana')
    expect(confirm.open.calls.argsFor(3)[1]?.typedConfirm?.expected).toBe('dana')
  })

  it('a business user with no role gets both questions and the typed name (server rule)', async () => {
    await component.onDeleteUser({ ...OWNER, businessRole: undefined })
    expect(confirm.open).toHaveBeenCalledTimes(2)
    expect(confirm.open.calls.argsFor(1)[1]?.typedConfirm?.expected).toBe('מטבח בדיקה')
  })

  it('a staff delete has no typed confirm', async () => {
    await component.onDeleteUser(STAFF)
    expect(confirm.open.calls.argsFor(0)[1]?.typedConfirm).toBeUndefined()
  })

  it('does not delete when the second question is declined', async () => {
    confirm.open.and.returnValues(Promise.resolve(true), Promise.resolve(false))
    await component.onDeleteUser(OWNER)
    expect(admin.deleteUser).not.toHaveBeenCalled()
  })

  it('deleting a staff user asks once', async () => {
    admin.deleteUser.and.returnValue(of({ ok: true, deletedBusiness: false, usersDeleted: 1 }))
    await component.onDeleteUser(STAFF)
    expect(confirm.open).toHaveBeenCalledTimes(1)
    expect(confirm.openTernary).not.toHaveBeenCalled()
    expect(admin.deleteUser).toHaveBeenCalledOnceWith('s1', false)
    expect(msg.onSetSuccessMsg).toHaveBeenCalledWith('user_deleted')
  })

  it("disables delete on a row of the admin's own business only", () => {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.c-icon-btn.danger')
    )
    expect(buttons.map((b) => b.getAttribute('aria-disabled'))).toEqual(['true', null, null])
    buttons[0].click()
    expect(confirm.open).not.toHaveBeenCalled()
    document.body.querySelectorAll('.c-tooltip').forEach((n) => n.remove())
  })

  describe('the AI allowance on a row (plan 736)', () => {
    const rowOf = (i: number) =>
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.list-item.group')[i]
    const inputOf = (i: number) => rowOf(i).querySelector<HTMLInputElement>('[data-testid="ai-allowance-input"]')!
    const saveOf = (i: number) => rowOf(i).querySelector<HTMLButtonElement>('[data-testid="ai-allowance-save"]')!
    const type = (i: number, value: string) => {
      const input = inputOf(i)
      input.value = value
      input.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }

    it('shows the default 100 and the used count; save is off until the number changes', () => {
      expect(inputOf(1).value).toBe('100')
      expect(rowOf(1).textContent).toContain('admin_ai_allowance_used')
      expect(saveOf(1).disabled).toBeTrue()
      type(1, '100')
      expect(saveOf(1).disabled).toBeTrue()
    })

    it('sends the PUT with the number and shows the saved numbers', () => {
      admin.setAiAllowance.and.returnValue(of({ ok: true, aiAllowance: 2, aiCallsUsed: 1 }))
      type(1, '2')
      expect(saveOf(1).disabled).toBeFalse()
      saveOf(1).click()
      fixture.detectChanges()
      expect(admin.setAiAllowance).toHaveBeenCalledOnceWith('o1', 2)
      expect(msg.onSetSuccessMsg).toHaveBeenCalledWith('admin_ai_allowance_saved')
      expect(inputOf(1).value).toBe('2')
      expect(saveOf(1).disabled).toBeTrue()
    })

    it('a bad number shows the error line and never sends', () => {
      for (const bad of ['-1', '1.5', '100001', '']) {
        type(1, bad)
        expect(saveOf(1).disabled).withContext(bad).toBeTrue()
        expect(rowOf(1).querySelector('[data-testid="ai-allowance-error"]')?.textContent).toContain(
          'admin_ai_allowance_invalid'
        )
        component.onSaveAllowance(OWNER)
      }
      expect(admin.setAiAllowance).not.toHaveBeenCalled()
    })

    it('a failed save shows server_error, keeps the saved number and lets the admin retry', () => {
      admin.setAiAllowance.and.returnValue(throwError(() => new Error('down')))
      type(1, '5')
      saveOf(1).click()
      fixture.detectChanges()
      expect(msg.onSetErrorMsg).toHaveBeenCalledWith('server_error')
      expect(rowOf(1).textContent).not.toContain('admin_ai_allowance_saved')
      expect(saveOf(1).disabled).toBeFalse()
      saveOf(1).click()
      expect(admin.setAiAllowance).toHaveBeenCalledTimes(2)
    })
  })

  // Plan 468 - the trash icon sits under the email, inside the card, never over it.
  it('puts the email and the remove button on separate rows, the button last in the card', () => {
    const items = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.list-item.group'))
    expect(items.length).toBe(3)
    for (const item of items) {
      const info = item.querySelector<HTMLElement>('.user-info')!
      const actions = item.querySelector<HTMLElement>('.item-actions')!
      expect(info.contains(actions)).toBeFalse()
      expect(info.querySelector('.user-email')).not.toBeNull()
      expect(info.querySelector('button')).toBeNull()
      expect(actions.querySelector('button.c-icon-btn.danger')).not.toBeNull()
      expect(item.lastElementChild).toBe(actions)
    }
  })
})
