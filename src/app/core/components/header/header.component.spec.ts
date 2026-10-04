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
            user_: signal({ _id: 'u1', name: 'dana', role: 'user', imgUrl: 'https://x.invalid/a.png' }),
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
