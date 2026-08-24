import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router, RouterLink } from '@angular/router'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'

import { TabChipsComponent } from './tab-chips.component'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'

@Component({ selector: 'app-blank-stub', template: '', standalone: true })
class BlankStubComponent {}

describe('TabChipsComponent', () => {
  let fixture: ComponentFixture<TabChipsComponent>
  let component: TabChipsComponent
  let router: Router
  let mockTranslation: jasmine.SpyObj<TranslationService>

  beforeEach(async () => {
    mockTranslation = jasmine.createSpyObj('TranslationService', [
      'translate',
      'resolveUnit',
      'resolveCategory',
      'resolveAllergen',
      'resolveSectionCategory',
      'resolvePreparationCategory'
    ])
    mockTranslation.translate.and.callFake((k: string) => k)

    await TestBed.configureTestingModule({
      imports: [TabChipsComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([
          { path: 'dashboard', component: BlankStubComponent },
          { path: 'venues', component: BlankStubComponent },
          { path: 'suppliers', component: BlankStubComponent },
          { path: 'trash', component: BlankStubComponent },
          { path: 'settings', component: BlankStubComponent }
        ]),
        { provide: TranslationService, useValue: mockTranslation }
      ]
    }).compileComponents()

    router = TestBed.inject(Router)
    fixture = TestBed.createComponent(TabChipsComponent)
    component = fixture.componentInstance
  })

  it('should create', async () => {
    await router.navigateByUrl('/dashboard')
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('should render the dashboard chip group on /dashboard', async () => {
    await router.navigateByUrl('/dashboard')
    fixture.detectChanges()
    const links = fixture.debugElement.queryAll(By.directive(RouterLink))
    const paths = links.map((de) => de.injector.get(RouterLink).href)
    expect(paths).toEqual(jasmine.arrayContaining(['/venues', '/dashboard?tab=metadata', '/suppliers', '/trash']))
  })

  it('should render nothing on a route with no mapped chip group', async () => {
    await router.navigateByUrl('/settings')
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('nav.c-tab-chips'))).toBeNull()
  })

  it('should scroll the pressed chip into view on click', async () => {
    await router.navigateByUrl('/dashboard')
    fixture.detectChanges()
    const chip = fixture.debugElement.query(By.directive(RouterLink)).nativeElement
    spyOn(chip, 'scrollIntoView')
    chip.click()
    expect(chip.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  })
})
