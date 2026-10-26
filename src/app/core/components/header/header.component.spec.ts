import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { HeaderComponent } from './header.component'
import { provideRouter, RouterLinkWithHref } from '@angular/router'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { signal } from '@angular/core'
import { of } from 'rxjs'
import { UserService } from '@services/user.service'
import { BusinessService } from '@services/business.service'

describe('HeaderComponent', () => {
  let component: HeaderComponent
  let fixture: ComponentFixture<HeaderComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        // מספקים נתיבים ריקים כדי לאפשר ל-RouterLink לעבוד בבדיקה
        provideRouter([
          { path: 'dashboard', redirectTo: '' },
          { path: 'inventory', redirectTo: '' },
          { path: 'recipe-builder', redirectTo: '' },
          { path: 'recipe-book', redirectTo: '' }
        ])
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(HeaderComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should have correct router links', () => {
    // איתור כל האלמנטים שמשתמשים ב-RouterLink
    const linkDebugElements = fixture.debugElement.queryAll(By.directive(RouterLinkWithHref))

    // שליפת הכתובות אליהן הקישורים מצביעים
    const hrefs = linkDebugElements.map((de) => de.attributes['routerLink'])

    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/inventory')
    expect(hrefs).toContain('/recipe-book')
    expect(hrefs).toContain('/menu-library')
  })

  it('should have 4 navigation links', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('li a')
    expect(navLinks.length).toBe(4)
  })
})

describe('HeaderComponent avatar fallback', () => {
  let fixture: ComponentFixture<HeaderComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => true,
            user_: signal({ _id: 'u1', name: 'dana', imgUrl: 'https://x.invalid/a.png' }),
            isPlatformAdmin_: signal(false),
            isOwner_: signal(false),
            logout: () => of(null)
          }
        }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(HeaderComponent)
    fixture.detectChanges()
  })

  it('shows initials instead of a broken image when the avatar fails to load', () => {
    const host: HTMLElement = fixture.nativeElement
    const img = host.querySelector('.user-chip .avatar-img')
    expect(img).toBeTruthy()

    img!.dispatchEvent(new Event('error'))
    fixture.detectChanges()

    expect(host.querySelector('.user-chip .avatar-img')).toBeNull()
    expect(host.querySelector('.user-chip .avatar-initials')?.textContent?.trim()).toBe('D')
  })
})

describe('HeaderComponent business and platform admin (plan 426)', () => {
  const isPlatformAdmin = signal(false)
  const isOwner = signal(false)
  const business = signal<{ name: string } | null>(null)
  let fixture: ComponentFixture<HeaderComponent>

  beforeEach(async () => {
    isPlatformAdmin.set(false)
    isOwner.set(false)
    business.set(null)
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => true,
            user_: signal({ _id: 'u1', name: 'dana' }),
            isPlatformAdmin_: isPlatformAdmin,
            isOwner_: isOwner,
            logout: () => of(null)
          }
        },
        { provide: BusinessService, useValue: { business_: business } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(HeaderComponent)
    fixture.detectChanges()
  })

  it('shows the crown badge only for a platform admin', () => {
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelector('.user-chip .role-badge')).toBeNull()
    isPlatformAdmin.set(true)
    fixture.detectChanges()
    expect(host.querySelector('.user-chip .role-badge')).not.toBeNull()
  })

  it('shows the business name under the username, and nothing when there is none', () => {
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelector('.user-chip .business-name')).toBeNull()
    business.set({ name: 'מטבח בדיקה' })
    fixture.detectChanges()
    expect(host.querySelector('.user-chip .business-name')?.textContent?.trim()).toBe('מטבח בדיקה')
  })

  it('shows the settings link in the pills, the drawer and the profile menu only to the owner (plan 428)', () => {
    const host: HTMLElement = fixture.nativeElement
    const settingsLinks = () => host.querySelectorAll('a[href="/settings"]')
    expect(settingsLinks().length).toBe(0)
    isOwner.set(true)
    fixture.detectChanges()
    // desktop pill + drawer entry; the profile menu item exists once the mobile profile menu is open
    expect(settingsLinks().length).toBe(2)
    ;(host.querySelector('.bottom-nav__profile .bottom-nav__item') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(host.querySelector('.profile-menu__item')).not.toBeNull()
  })

  it('shows the platform dashboard link only to the platform admin (plan 448)', () => {
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelectorAll('a[href="/platform"]').length).toBe(0)
    isPlatformAdmin.set(true)
    fixture.detectChanges()
    expect(host.querySelectorAll('a[href="/platform"]').length).toBe(2)
  })
})
