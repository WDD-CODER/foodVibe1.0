import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { Business } from '@schemas/entities'
import { BusinessNameFormComponent } from './business-name-form.component'

const BUSINESS: Business = {
  _id: 'b1',
  name: 'Stored name',
  ownerId: 'o1',
  createdAt: 1,
  internal: false,
  lastSyncedMasterVersion: 0
}

describe('BusinessNameFormComponent', () => {
  let fixture: ComponentFixture<BusinessNameFormComponent>
  let business_: ReturnType<typeof signal<Business | null>>
  let updateName: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  let logging: jasmine.SpyObj<LoggingService>

  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('[data-testid="business-name-input"]')
  const saveBtn = (): HTMLButtonElement => fixture.nativeElement.querySelector('[data-testid="business-name-save"]')
  const type = (text: string): void => {
    const el = input()
    el.value = text
    el.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  beforeEach(() => {
    business_ = signal<Business | null>(BUSINESS)
    updateName = jasmine.createSpy('updateName').and.callFake(async (name: string) => {
      business_.update((business) => (business ? { ...business, name } : business))
    })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['warn', 'error'])
    TestBed.configureTestingModule({
      imports: [BusinessNameFormComponent],
      providers: [
        { provide: BusinessService, useValue: { business_: business_.asReadonly(), updateName } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: logging },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    fixture = TestBed.createComponent(BusinessNameFormComponent)
    fixture.detectChanges()
  })

  it('shows the stored name and keeps save disabled until it changes', () => {
    expect(input().value).toBe('Stored name')
    expect(saveBtn().disabled).toBeTrue()
    type('Other name')
    expect(saveBtn().disabled).toBeFalse()
    type('  Stored name ')
    expect(saveBtn().disabled).toBeTrue()
  })

  it('refuses an empty name: error shown, save disabled', () => {
    type('   ')
    expect(saveBtn().disabled).toBeTrue()
    expect(fixture.nativeElement.querySelector('.c-field-error')?.textContent).toContain('business_name_required')
  })

  it('calls updateName with the trimmed text, shows the success message and goes back to disabled', async () => {
    type('  Dana kitchen  ')
    await fixture.componentInstance.save()
    fixture.detectChanges()
    expect(updateName).toHaveBeenCalledOnceWith('Dana kitchen')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('business_name_saved')
    expect(input().value).toBe('Dana kitchen')
    expect(saveBtn().disabled).toBeTrue()
  })

  it('a failed save logs the error and shows save_failed; a 400 shows settings_invalid', async () => {
    updateName.and.rejectWith({ status: 500 })
    type('New')
    await fixture.componentInstance.save()
    expect(logging.error).toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('save_failed')
    updateName.and.rejectWith({ status: 400 })
    await fixture.componentInstance.save()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('settings_invalid')
  })
})
