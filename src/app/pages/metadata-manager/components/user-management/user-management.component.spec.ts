import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { of } from 'rxjs'
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
    admin = jasmine.createSpyObj<UserAdminService>('UserAdminService', ['getUsers', 'deleteUser'])
    admin.getUsers.and.returnValue(of([MINE, OWNER, STAFF]))
    admin.deleteUser.and.returnValue(of({ ok: true, deletedBusiness: true, usersDeleted: 2 }))
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(true)
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

  it('deleting an owner asks twice and deletes only after both yes', async () => {
    await component.onDeleteUser(OWNER)
    expect(confirm.open).toHaveBeenCalledTimes(2)
    expect(confirm.open.calls.argsFor(0)[0]).toContain('delete_business_confirm')
    expect(confirm.open.calls.argsFor(1)[0]).toBe('delete_business_confirm_final')
    expect(admin.deleteUser).toHaveBeenCalledOnceWith('o1')
    expect(msg.onSetSuccessMsg).toHaveBeenCalledWith('business_deleted')
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
    expect(admin.deleteUser).toHaveBeenCalledOnceWith('s1')
    expect(msg.onSetSuccessMsg).toHaveBeenCalledWith('user_deleted')
  })

  it("disables delete on a row of the admin's own business only", () => {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.c-icon-btn.danger')
    )
    expect(buttons.map((b) => b.disabled)).toEqual([true, false, false])
  })
})
