import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { User } from '@models/user.model'
import { WelcomePage } from './welcome.page'

describe('WelcomePage', () => {
  let fixture: ComponentFixture<WelcomePage>
  let el: HTMLElement
  const user_ = signal<User | null>(null)
  const open = jasmine.createSpy('open')
  let router: Router

  beforeEach(async () => {
    user_.set(null)
    open.calls.reset()
    await TestBed.configureTestingModule({
      imports: [WelcomePage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: { user_: user_.asReadonly() } },
        { provide: AuthModalService, useValue: { open } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    router = TestBed.inject(Router)
    spyOn(router, 'navigateByUrl').and.resolveTo(true)
    fixture = TestBed.createComponent(WelcomePage)
    fixture.detectChanges()
    el = fixture.nativeElement
  })

  it('renders the promise, three rooms and two buttons', () => {
    expect(el.querySelector('.welcome__promise')?.textContent).toContain('welcome_promise')
    expect(el.querySelectorAll('[data-testid="welcome-room"]').length).toBe(3)
    expect(el.querySelectorAll('button').length).toBe(2)
  })

  it('makes the highlighted promise span inline-block so one amber line sits under it', () => {
    const span = el.querySelector('.welcome__promise .c-pass-line') as HTMLElement
    expect(getComputedStyle(span).display).toBe('inline-block')
  })

  it('sign-in button opens the sign-in modal returning to /dashboard', () => {
    ;(el.querySelector('[data-testid="welcome-sign-in"]') as HTMLButtonElement).click()
    expect(open).toHaveBeenCalledWith('sign-in', '/dashboard')
  })

  it('sign-up button opens the sign-up modal returning to /dashboard', () => {
    ;(el.querySelector('[data-testid="welcome-sign-up"]') as HTMLButtonElement).click()
    expect(open).toHaveBeenCalledWith('sign-up', '/dashboard')
  })

  it('leaves for the dashboard when a user appears', () => {
    expect(router.navigateByUrl).not.toHaveBeenCalled()
    user_.set({ _id: 'u', name: 'u', email: 'u@x' } as User)
    fixture.detectChanges()
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true })
  })
})
