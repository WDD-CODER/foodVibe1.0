import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ModuleService } from '@services/module.service'
import { Router, provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { HeroFabService } from '@services/hero-fab.service'
import { HeroFabComponent } from './hero-fab.component'

describe('HeroFabComponent', () => {
  beforeEach(() => (aiOn = true))

  let aiOn = true
  const create = (url: string): ComponentFixture<HeroFabComponent> => {
    TestBed.configureTestingModule({
      imports: [HeroFabComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: ModuleService, useValue: { has: () => aiOn, hasType: () => true } },
        provideRouter([]),
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

  it('renders the floating button on /dashboard', () => {
    const fixture = create('/dashboard')
    expect(fixture.nativeElement.querySelector('.hero-fab-container')).not.toBeNull()
  })

  it('leaves out an action whose module is off and keeps the others (plan 620)', () => {
    aiOn = false
    const fixture = create('/dashboard')
    TestBed.inject(HeroFabService).setPageActions(
      [
        { labelKey: 'ai_x', icon: 'sparkles', module: 'ai_create', run: () => undefined },
        { labelKey: 'plain', icon: 'plus', run: () => undefined }
      ],
      'replace'
    )
    const shown = (
      fixture.componentInstance as unknown as { effectiveActions_(): { labelKey: string }[] }
    ).effectiveActions_()
    expect(shown.map((a) => a.labelKey)).toEqual(['plain'])
    aiOn = true
    TestBed.inject(HeroFabService).setPageActions(
      [{ labelKey: 'ai_x', icon: 'sparkles', module: 'ai_create', run: () => undefined }],
      'replace'
    )
    expect(
      (fixture.componentInstance as unknown as { effectiveActions_(): unknown[] }).effectiveActions_().length
    ).toBe(1)
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
