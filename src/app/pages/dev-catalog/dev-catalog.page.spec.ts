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

  it('renders 18 sections whose headings are the family ids in order', () => {
    const el = fixture.nativeElement as HTMLElement
    const sections = el.querySelectorAll('main > section')
    expect(sections.length).toBe(18)
    const ids = Array.from(sections).map((s) => s.querySelector('h2')?.textContent?.trim())
    expect(ids).toEqual([
      'search-combobox',
      'multi-pick',
      'modal-shell',
      'list-page',
      'falling-columns',
      'empty-state',
      'form-field',
      'number-box',
      'stepper',
      'chip',
      'feedback',
      'edit-gate',
      'cost-badge',
      'scroll-area',
      'sideways-row',
      'drag-list',
      'tooltip',
      'engine-classes'
    ])
  })

  it('has an app-search-combobox in the first section and a chip per section that is a button, not a link', () => {
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('main > section app-search-combobox')).toBeTruthy()
    expect(el.querySelectorAll('nav button.c-chip[data-jump]').length).toBe(18)
    expect(el.querySelectorAll('nav a').length).toBe(0)
  })

  it('a top chip scrolls to its section and moves focus to its heading (plan 747)', () => {
    const el = fixture.nativeElement as HTMLElement
    document.body.appendChild(el)
    const section = el.querySelector('#tooltip') as HTMLElement
    const scroll = spyOn(section, 'scrollIntoView')
    ;(el.querySelector('nav button[data-jump="tooltip"]') as HTMLButtonElement).click()
    expect(scroll).toHaveBeenCalledTimes(1)
    const options = scroll.calls.mostRecent().args[0] as ScrollIntoViewOptions
    expect(options.block).toBe('start')
    expect(document.activeElement).toBe(section.querySelector('h2'))
    el.remove()
  })

  it('the "disabled with a reason" sample never runs its click and is not natively disabled (plan 747)', () => {
    const el = fixture.nativeElement as HTMLElement
    const btn = el.querySelector('#dc-disabled-btn') as HTMLButtonElement
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    expect(btn.disabled).toBeFalse()
    btn.click()
    fixture.detectChanges()
    expect(el.querySelector('#dc-disabled-count')?.textContent?.trim()).toBe('0')
    document.body.querySelectorAll('.c-tooltip').forEach((n) => n.remove())
  })
})
