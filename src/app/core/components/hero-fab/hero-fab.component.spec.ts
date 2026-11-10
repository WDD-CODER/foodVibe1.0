import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { HeroFabComponent } from './hero-fab.component'

describe('HeroFabComponent', () => {
  const create = (url: string): ComponentFixture<HeroFabComponent> => {
    TestBed.configureTestingModule({
      imports: [HeroFabComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
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
})
