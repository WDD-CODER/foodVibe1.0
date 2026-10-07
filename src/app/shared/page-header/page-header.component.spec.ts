import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { PageHeaderComponent } from './page-header.component'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header [titleKey]="titleKey" [count]="count" countLabel="3 of 9" [backLink]="backLink">
      <input header-search class="search-input" />
      <button header-leading class="filter-btn" type="button">f</button>
      <button header-actions class="add-btn" type="button">+</button>
    </app-page-header>
  `
})
class HostComponent {
  titleKey: string | null = 'suppliers'
  count: number | null = 3
  backLink: string | null = null
}

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `<app-page-header titleKey="dashboard" subtitleKey="dashboard_subtitle" />`
})
class SubtitleHostComponent {}

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => (k ? `t:${k}` : ''))
    await TestBed.configureTestingModule({
      imports: [HostComponent, SubtitleHostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [provideRouter([]), { provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
  })

  it('renders the translated title as the page h1', () => {
    fixture.detectChanges()
    const h1 = fixture.debugElement.query(By.css('h1.ph-title')).nativeElement as HTMLElement
    expect(h1.textContent?.trim()).toBe('t:suppliers')
  })

  it('renders the count pill with its screen-reader label, and hides it for null', () => {
    fixture.detectChanges()
    const pill = fixture.debugElement.query(By.css('.ph-count')).nativeElement as HTMLElement
    expect(pill.textContent?.trim()).toBe('3')
    expect(pill.getAttribute('aria-label')).toBe('3 of 9')

    const f2 = TestBed.createComponent(HostComponent)
    f2.componentInstance.count = null
    f2.detectChanges()
    expect(f2.debugElement.query(By.css('.ph-count'))).toBeNull()
  })

  it('renders a back link only when backLink is set', () => {
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('.ph-back'))).toBeNull()

    const f2 = TestBed.createComponent(HostComponent)
    f2.componentInstance.backLink = '/dashboard'
    f2.detectChanges()
    const back = f2.debugElement.query(By.css('a.ph-back')).nativeElement as HTMLAnchorElement
    expect(back.getAttribute('href')).toBe('/dashboard')
  })

  it('renders the optional subtitle under the title', () => {
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('.ph-subtitle'))).toBeNull()

    const f2 = TestBed.createComponent(SubtitleHostComponent)
    f2.detectChanges()
    const sub = f2.debugElement.query(By.css('.ph-subtitle')).nativeElement as HTMLElement
    expect(sub.textContent?.trim()).toBe('t:dashboard_subtitle')
  })

  it('projects search, leading and action slots', () => {
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('.ph-search .search-input'))).not.toBeNull()
    expect(fixture.debugElement.query(By.css('.ph-end .filter-btn'))).not.toBeNull()
    expect(fixture.debugElement.query(By.css('.ph-end .add-btn'))).not.toBeNull()
  })
})
