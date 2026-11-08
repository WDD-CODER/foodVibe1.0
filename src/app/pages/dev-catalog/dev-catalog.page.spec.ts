import { importProvidersFrom } from '@angular/core'
import { LucideAngularModule, icons } from 'lucide-angular'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { TranslationService } from '@services/translation.service'
import { DevCatalogPage } from './dev-catalog.page'

describe('DevCatalogPage', () => {
  let fixture: ComponentFixture<DevCatalogPage>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevCatalogPage],
      providers: [
        importProvidersFrom(LucideAngularModule.pick({ ...icons, AlertTriangle: icons.TriangleAlert })),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(DevCatalogPage)
    fixture.detectChanges()
  })

  it('renders 13 sections whose headings are the family ids in order', () => {
    const el = fixture.nativeElement as HTMLElement
    const sections = el.querySelectorAll('main > section')
    expect(sections.length).toBe(13)
    const ids = Array.from(sections).map((s) => s.querySelector('h2')?.textContent?.trim())
    expect(ids).toEqual([
      'search-combobox',
      'multi-pick',
      'modal-shell',
      'list-page',
      'empty-state',
      'form-field',
      'number-box',
      'stepper',
      'chip',
      'feedback',
      'edit-gate',
      'cost-badge',
      'engine-classes'
    ])
  })

  it('has an app-search-combobox in the first section and a link per section', () => {
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('main > section app-search-combobox')).toBeTruthy()
    expect(el.querySelectorAll('nav a[href^="#"]').length).toBe(13)
  })
})
