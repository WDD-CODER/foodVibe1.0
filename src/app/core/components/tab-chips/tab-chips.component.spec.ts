import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router, RouterLink } from '@angular/router'
import { By } from '@angular/platform-browser'
import { LucideAngularModule, Wrench } from 'lucide-angular'

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
      imports: [TabChipsComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Wrench })],
      providers: [
        provideRouter([
          { path: 'dashboard', component: BlankStubComponent },
          { path: 'venues', component: BlankStubComponent },
          { path: 'suppliers', component: BlankStubComponent },
          { path: 'trash', component: BlankStubComponent },
          { path: 'inventory/list', component: BlankStubComponent },
          { path: 'inventory/equipment', component: BlankStubComponent },
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

  it('should render products then equipment chips on both inventory screens', async () => {
    for (const url of ['/inventory/list', '/inventory/equipment']) {
      await router.navigateByUrl(url)
      fixture.detectChanges()
      const links = fixture.debugElement.queryAll(By.directive(RouterLink))
      const paths = links.map((de) => de.injector.get(RouterLink).href)
      expect(paths).toEqual(['/inventory/list', '/inventory/equipment'])
    }
  })

  const chipIds = (): string[] =>
    fixture.debugElement
      .queryAll(By.css('a.c-tab-pill'))
      .map((de) => de.injector.get(RouterLink).href ?? '')

  it('shows the 4 sub-page chips (no home chip) on the dashboard overview', async () => {
    await router.navigateByUrl('/dashboard')
    fixture.detectChanges()
    expect(chipIds()).toEqual(['/venues', '/dashboard?tab=metadata', '/suppliers', '/trash'])
    expect(fixture.debugElement.query(By.css('.c-tab-pill--home'))).toBeNull()
  })

  it('replaces the current sub-page chip with the dashboard chip, in the same position', async () => {
    const cases: [string, string[]][] = [
      ['/venues', ['/dashboard', '/dashboard?tab=metadata', '/suppliers', '/trash']],
      ['/dashboard?tab=metadata', ['/venues', '/dashboard', '/suppliers', '/trash']],
      ['/suppliers', ['/venues', '/dashboard?tab=metadata', '/dashboard', '/trash']],
      ['/trash', ['/venues', '/dashboard?tab=metadata', '/suppliers', '/dashboard']]
    ]
    for (const [url, expected] of cases) {
      await router.navigateByUrl(url)
      fixture.detectChanges()
      expect(chipIds()).withContext(url).toEqual(expected)
      const home = fixture.debugElement.query(By.css('.c-tab-pill--home'))
      expect(home).withContext(url).not.toBeNull()
      expect(fixture.debugElement.query(By.css('a.c-tab-pill.active'))).withContext(url).toBeNull()
    }
  })

  it('updates on query-param-only navigation (metadata ↔ overview)', async () => {
    await router.navigateByUrl('/dashboard?tab=metadata')
    fixture.detectChanges()
    expect(chipIds()[1]).toBe('/dashboard')
    await router.navigateByUrl('/dashboard')
    fixture.detectChanges()
    expect(chipIds()[1]).toBe('/dashboard?tab=metadata')
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
