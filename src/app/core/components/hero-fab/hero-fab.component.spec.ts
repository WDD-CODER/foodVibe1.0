import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { signal } from '@angular/core'
import { HeroFabService } from '@services/hero-fab.service'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { HeroFabComponent } from './hero-fab.component'

describe('HeroFabComponent', () => {
  const aiOn = signal(true)
  beforeEach(() => aiOn.set(true))
  const create = (url: string): ComponentFixture<HeroFabComponent> => {
    TestBed.configureTestingModule({
      imports: [HeroFabComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: ModuleService, useValue: { has: () => aiOn() } },
        { provide: UserService, useValue: { isLoggedIn: () => false } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue(url)
    const fixture = TestBed.createComponent(HeroFabComponent)
    fixture.detectChanges()
    return fixture
  }

  it('renders no floating button on /welcome', () => {
    const fixture = create('/welcome')
    expect(fixture.nativeElement.querySelector('.hero-fab-container')).toBeNull()
  })

  it('leaves out an action whose module is off and keeps the others (plan 620)', () => {
    const fixture = create('/dashboard')
    TestBed.inject(HeroFabService).setPageActions(
      [
        { labelKey: 'plain_action', icon: 'plus', run: () => {} },
        { labelKey: 'ai_action', icon: 'sparkles', run: () => {}, module: 'ai_create' }
      ],
      'replace'
    )
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('ai_action')
    aiOn.set(false)
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).not.toContain('ai_action')
    expect(fixture.nativeElement.textContent).toContain('plain_action')
  })

  it('renders the floating button on /dashboard', () => {
    const fixture = create('/dashboard')
    expect(fixture.nativeElement.querySelector('.hero-fab-container')).not.toBeNull()
  })

  const hidesOnPhone = (url: string): boolean =>
    create(url).nativeElement.querySelector('.hero-fab-container').classList.contains('hide-on-phone')

  for (const url of [
    '/inventory/add',
    '/inventory/edit/abc',
    '/inventory/equipment/add',
    '/suppliers/edit/abc',
    '/venues/add',
    '/inventory/add?x=1'
  ]) {
    it('marks ' + url + ' as an entity form', () => {
      expect(hidesOnPhone(url)).toBeTrue()
    })
  }

  for (const url of ['/inventory/list', '/venues/view/abc', '/recipe-builder']) {
    it('does not mark ' + url + ' as an entity form', () => {
      expect(hidesOnPhone(url)).toBeFalse()
    })
  }
})
