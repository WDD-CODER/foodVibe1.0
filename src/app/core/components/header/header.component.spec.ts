import { FrontDeskBadgeService } from '@services/front-desk-badge.service'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { HeaderComponent } from './header.component'
import { provideRouter, RouterLinkWithHref } from '@angular/router'
import { By } from '@angular/platform-browser'
import { ArrowLeftRight, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { signal } from '@angular/core'
import { of } from 'rxjs'
import { UserService } from '@services/user.service'
import { BusinessService } from '@services/business.service'
import { AccessService } from '@services/access.service'
import { UserMsgService } from '@services/user-msg.service'
import type { ModuleKey } from '@schemas/modules-pure'
import { ModuleService } from '@services/module.service'

/** Plan 620: every module on by default; a case sets `modulesOn` to turn some off. */
const ALL_MODULES: ModuleKey[] = ['events', 'event_logistics', 'frontdesk', 'ai_create']
const modulesOn = signal<ModuleKey[]>(ALL_MODULES)
const moduleStub = {
  provide: ModuleService,
  useValue: { has: (keys: ModuleKey | readonly ModuleKey[]) => [keys].flat().some((key) => modulesOn().includes(key)) }
}
beforeEach(() => modulesOn.set(ALL_MODULES))

describe('HeaderComponent', () => {
  let component: HeaderComponent
  let fixture: ComponentFixture<HeaderComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        moduleStub,
        // מספקים נתיבים ריקים כדי לאפשר ל-RouterLink לעבוד בבדיקה
        provideRouter([
          { path: 'dashboard', redirectTo: '' },
          { path: 'inventory', redirectTo: '' },
          { path: 'recipe-builder', redirectTo: '' },
          { path: 'recipe-book', redirectTo: '' }
        ]),
        // A stub guest: the real service reads a user left in sessionStorage by an earlier spec, which adds the owner's settings link.
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => false,
            user_: signal(null),
            isPlatformAdmin_: signal(false),
            isOwner_: signal(false),
            acting_: signal(null),
            homeBusinessId_: signal(null),
            consumeAccessEndedNotice: () => false,
            logout: () => of(null)
          }
        }
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
    expect(hrefs).toContain('/clients')
  })

  it('should have 5 navigation links (the Front Desk link included, plan 547)', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('li a')
    expect(navLinks.length).toBe(5)
  })

  describe('modules (plan 620)', () => {
    const hrefs = () => Array.from<Element>(fixture.nativeElement.querySelectorAll('a[href="/menu-library"]'))
    const clients = () => Array.from<Element>(fixture.nativeElement.querySelectorAll('a[href="/clients"]'))

    it('hides /menu-library in the pills, the drawer and the bottom bar without events', () => {
      expect(hrefs().length).toBeGreaterThan(0)
      modulesOn.set(['frontdesk', 'ai_create'])
      fixture.detectChanges()
      expect(hrefs().length).toBe(0)
      expect(clients().length).toBeGreaterThan(0)
    })

    it('hides /clients when both events and frontdesk are off', () => {
      modulesOn.set(['ai_create'])
      fixture.detectChanges()
      expect(clients().length).toBe(0)
      expect(hrefs().length).toBe(0)
    })

    it('keeps /clients when only events is on', () => {
      modulesOn.set(['events'])
      fixture.detectChanges()
      expect(clients().length).toBeGreaterThan(0)
    })
  })
})

describe('HeaderComponent avatar fallback', () => {
  let fixture: ComponentFixture<HeaderComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        moduleStub,
        provideRouter([]),
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => true,
            user_: signal({ _id: 'u1', name: 'dana', imgUrl: 'https://x.invalid/a.png' }),
            isPlatformAdmin_: signal(false),
            isOwner_: signal(false),
            acting_: signal(null),
            homeBusinessId_: signal(null),
            consumeAccessEndedNotice: () => false,
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
        moduleStub,
        provideRouter([]),
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => true,
            user_: signal({ _id: 'u1', name: 'dana' }),
            isPlatformAdmin_: isPlatformAdmin,
            isOwner_: isOwner,
            acting_: signal(null),
            homeBusinessId_: signal(null),
            consumeAccessEndedNotice: () => false,
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

describe('HeaderComponent phone bottom bar labels (plan 597, 607)', () => {
  let fixture: ComponentFixture<HeaderComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        moduleStub,
        provideRouter([]),
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => false,
            user_: signal(null),
            isPlatformAdmin_: signal(false),
            isOwner_: signal(false),
            acting_: signal(null),
            homeBusinessId_: signal(null),
            consumeAccessEndedNotice: () => false,
            logout: () => of(null)
          }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(HeaderComponent)
    fixture.detectChanges()
  })

  it('renders the short keys in the bottom bar and keeps the full name for the clients tab', () => {
    const host: HTMLElement = fixture.nativeElement
    const labels = Array.from(host.querySelectorAll('.bottom-nav .bottom-nav__label')).map((e) => e.textContent?.trim())
    const short = ['nav_short_recipe_book', 'nav_short_menu_library', 'nav_short_frontdesk']
    const fullKeys = ['recipe_book', 'menu_library', 'frontdesk_section']
    const dict = (k: string) =>
      (fixture.componentInstance as unknown as { translation: { translate(k: string): string } }).translation.translate(
        k
      )
    for (const k of short) expect(labels).toContain(dict(k))
    for (const k of fullKeys) expect(labels).not.toContain(dict(k))
    const clients = host.querySelector('.bottom-nav a[href="/clients"]')
    expect(clients?.getAttribute('aria-label')).toBe(dict('frontdesk_section'))
  })
})

describe('HeaderComponent waiting badge only in the top nav (plan 607)', () => {
  it('renders no count in the bottom bar and still renders it in the top nav', async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        moduleStub,
        provideRouter([]),
        { provide: FrontDeskBadgeService, useValue: { waitingCount_: signal(3) } },
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => false,
            user_: signal(null),
            isPlatformAdmin_: signal(false),
            isOwner_: signal(false),
            acting_: signal(null),
            homeBusinessId_: signal(null),
            consumeAccessEndedNotice: () => false,
            logout: () => of(null)
          }
        }
      ]
    }).compileComponents()
    const fixture = TestBed.createComponent(HeaderComponent)
    fixture.detectChanges()
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelectorAll('.bottom-nav .c-chip__count').length).toBe(0)
    expect(host.querySelector('[data-testid="header-waiting-count"]')?.textContent?.trim()).toBe('3')
    const label = host.querySelector('.bottom-nav a[href="/clients"]')?.getAttribute('aria-label')
    expect(label).not.toContain('3')
  })
})

describe('HeaderComponent business switcher (plan 632)', () => {
  const canSwitch = signal(false)
  const businesses = signal<{ businessId: string; name: string; role: string }[]>([])
  const user = signal<{ _id: string; name: string; businessId: string }>({ _id: 'u1', name: 'dana', businessId: 'b1' })
  const switchBusiness = jasmine.createSpy('switchBusiness')
  const loadBusinesses = jasmine.createSpy('loadBusinesses')
  const consume = jasmine.createSpy('consume')
  let fixture: ComponentFixture<HeaderComponent>

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [
        HeaderComponent,
        HttpClientTestingModule,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ArrowLeftRight })
      ],
      providers: [
        moduleStub,
        provideRouter([]),
        {
          provide: UserService,
          useValue: {
            isLoggedIn: () => true,
            user_: user,
            isPlatformAdmin_: signal(false),
            isOwner_: signal(false),
            acting_: signal(null),
            homeBusinessId_: signal('b1'),
            consumeAccessEndedNotice: consume,
            switchBusiness,
            logout: () => of(null)
          }
        },
        { provide: BusinessService, useValue: { business_: signal({ name: 'Mine' }) } },
        { provide: AccessService, useValue: { canSwitch_: canSwitch, businesses_: businesses, loadBusinesses } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(HeaderComponent)
    fixture.detectChanges()
  }

  beforeEach(() => {
    canSwitch.set(false)
    businesses.set([{ businessId: 'b1', name: 'Mine', role: 'owner' }])
    switchBusiness.calls.reset()
    loadBusinesses.calls.reset()
    consume.calls.reset()
    consume.and.returnValue(false)
  })

  it('shows the plain business name and no switcher when there is nothing to switch to', async () => {
    await setup()
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelector('[data-testid="business-switcher"]')).toBeNull()
    expect(host.querySelector('.business-name')?.textContent?.trim()).toBe('Mine')
    expect(loadBusinesses).toHaveBeenCalledTimes(1)
  })

  it('shows the switcher instead of the name when there is somewhere to switch to', async () => {
    canSwitch.set(true)
    businesses.set([
      { businessId: 'b1', name: 'Mine', role: 'owner' },
      { businessId: 'b2', name: 'Client', role: 'consultant' }
    ])
    await setup()
    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelector('[data-testid="business-switcher"]')).not.toBeNull()
    expect(host.querySelector('.business-name')).toBeNull()
  })

  it('switching to another business asks the user service; the home id is sent as null', async () => {
    canSwitch.set(true)
    businesses.set([
      { businessId: 'b1', name: 'Mine', role: 'owner' },
      { businessId: 'b2', name: 'Client', role: 'consultant' }
    ])
    switchBusiness.and.resolveTo(true)
    await setup()
    const cmp = fixture.componentInstance as unknown as { switchTo(id: string): Promise<void> }
    await cmp.switchTo('b2')
    expect(switchBusiness).toHaveBeenCalledWith('b2')
    user.set({ _id: 'u1', name: 'dana', businessId: 'b2' })
    await cmp.switchTo('b1')
    expect(switchBusiness).toHaveBeenCalledWith(null)
    user.set({ _id: 'u1', name: 'dana', businessId: 'b1' })
  })

  it('a failed switch shows the failure toast and keeps the active business', async () => {
    canSwitch.set(true)
    switchBusiness.and.resolveTo(false)
    await setup()
    const toast = spyOn(TestBed.inject(UserMsgService), 'onSetErrorMsg')
    const cmp = fixture.componentInstance as unknown as {
      switchTo(id: string): Promise<void>
      selectedBusinessId_(): string
    }
    await cmp.switchTo('b2')
    expect(toast).toHaveBeenCalled()
    expect(cmp.selectedBusinessId_()).toBe('b1')
  })

  it('the phone profile menu lists the other businesses', async () => {
    canSwitch.set(true)
    businesses.set([
      { businessId: 'b1', name: 'Mine', role: 'owner' },
      { businessId: 'b2', name: 'Client', role: 'consultant' }
    ])
    await setup()
    const host: HTMLElement = fixture.nativeElement
    ;(host.querySelector('.bottom-nav__profile .bottom-nav__item') as HTMLButtonElement).click()
    fixture.detectChanges()
    const rows = Array.from(host.querySelectorAll('.profile-menu button.profile-menu__item')).map((e) =>
      e.textContent?.trim()
    )
    expect(rows).toEqual(['Client'])
  })

  it('shows the access-ended toast once when the notice was set', async () => {
    consume.and.returnValue(true)
    await setup()
    // the toast service is real here: the call is what matters
    expect(consume).toHaveBeenCalledTimes(1)
  })
})
