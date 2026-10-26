import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { AuthModalComponent } from './auth-modal.component'
import { AuthModalService } from '@services/auth-modal.service'
import { UserService } from '@services/user.service'
import { CloudinaryService } from '@services/cloudinary.service'
import { TranslationService } from '@services/translation.service'

type Internals = {
  name: string
  email: string
  password: string
  confirmPassword: string
  businessName: string
  errorKey: () => string | null
  onSubmit: () => void
}

describe('AuthModalComponent (business name and block messages)', () => {
  let fixture: ComponentFixture<AuthModalComponent>
  let c: Internals
  let userService: jasmine.SpyObj<UserService>

  beforeEach(async () => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['signup', 'login', 'loginAsGuestBackend'])
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService },
        { provide: CloudinaryService, useValue: {} },
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => (k === 'business_name_default' ? 'Biz of {{name}}' : k) }
        }
      ]
    }).compileComponents()
    TestBed.inject(AuthModalService).open('sign-up')
    fixture = TestBed.createComponent(AuthModalComponent)
    fixture.detectChanges()
    c = fixture.componentInstance as unknown as Internals
    c.name = 'neo'
    c.email = 'neo@x.com'
    c.password = 'Password1'
    c.confirmPassword = 'Password1'
  })

  it('shows the business name field in sign-up mode only', () => {
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelector('#auth-business-name')).not.toBeNull()
    expect(host.querySelector('#auth-business-name')?.getAttribute('maxlength')).toBe('200')
    TestBed.inject(AuthModalService).mode.set('sign-in')
    fixture.detectChanges()
    expect(host.querySelector('#auth-business-name')).toBeNull()
  })

  it('an empty business name sends the sign-up request with an empty string and shows no error', () => {
    userService.signup.and.returnValue(of({ name: 'neo', email: 'neo@x.com' }))
    c.businessName = '   '
    c.onSubmit()
    expect(c.errorKey()).toBeNull()
    expect(userService.signup).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'neo' }), 'Password1', '')
  })

  it('the business name box is not required and its placeholder follows the typed username', () => {
    const host: HTMLElement = fixture.nativeElement
    const input = host.querySelector('#auth-business-name') as HTMLInputElement
    const typeUsername = (text: string): void => {
      const nameBox = host.querySelector('#auth-name') as HTMLInputElement
      nameBox.value = text
      nameBox.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    expect(input.required).toBeFalse()
    typeUsername('chef472')
    expect(input.placeholder).toBe('Biz of chef472')
    typeUsername('')
    expect(input.placeholder).toBe('Biz of username')
    expect(host.querySelector('[data-testid="business-name-hint"]')).not.toBeNull()
  })

  it('the staff hint shows in sign-up and not in sign-in', () => {
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelector('[data-testid="signup-staff-hint"]')).not.toBeNull()
    TestBed.inject(AuthModalService).mode.set('sign-in')
    fixture.detectChanges()
    expect(host.querySelector('[data-testid="signup-staff-hint"]')).toBeNull()
  })

  it('201 characters -> business_name_too_long and no request', () => {
    c.businessName = 'x'.repeat(201)
    c.onSubmit()
    expect(c.errorKey()).toBe('business_name_too_long')
    expect(userService.signup).not.toHaveBeenCalled()
  })

  it('sends the trimmed business name to signup', () => {
    userService.signup.and.returnValue(of({ name: 'neo', email: 'neo@x.com' }))
    c.businessName = '  מטבח בדיקה '
    c.onSubmit()
    expect(userService.signup).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'neo', email: 'neo@x.com' }),
      'Password1',
      'מטבח בדיקה'
    )
  })

  it('maps the server business-name error', () => {
    userService.signup.and.returnValue(throwError(() => new Error('BUSINESS_NAME_REQUIRED')))
    c.businessName = 'x'
    c.onSubmit()
    expect(c.errorKey()).toBe('business_name_required')
  })

  const signInWith = (code: string): string | null => {
    TestBed.inject(AuthModalService).mode.set('sign-in')
    userService.login.and.returnValue(throwError(() => new Error(code)))
    c.name = 'neo'
    c.password = 'Password1'
    c.onSubmit()
    return c.errorKey()
  }

  it('Error NO_BUSINESS -> no_business', () => {
    expect(signInWith('NO_BUSINESS')).toBe('no_business')
  })

  it('Error USER_REMOVED -> user_removed', () => {
    expect(signInWith('USER_REMOVED')).toBe('user_removed')
  })
})
