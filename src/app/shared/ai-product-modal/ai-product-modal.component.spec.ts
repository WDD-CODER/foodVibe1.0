import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { GeminiService } from '@services/gemini.service'
import { getGeminiUsage } from '@utils/gemini-usage.util'
import type { AiProductDraft } from '@models/ai-product-draft.model'
import { AiProductModalComponent } from './ai-product-modal.component'
import { AiProductModalService } from './ai-product-modal.service'

type Internals = { draft_: { (): AiProductDraft | null; set: (d: AiProductDraft | null) => void } }

describe('AiProductModalComponent base unit (plan 497)', () => {
  let fixture: ComponentFixture<AiProductModalComponent>
  let component: AiProductModalComponent

  const draft: AiProductDraft = {
    nameHebrew: 'קמח',
    baseUnit: 'gram',
    categories: [],
    allergens: [],
    yieldFactor: 1,
    minStockLevel: 0,
    expiryDaysDefault: 0
  }

  beforeEach(async () => {
    const gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['fetchUsage'])
    gemini.fetchUsage.and.callFake(() => Promise.resolve(getGeminiUsage()))
    TestBed.configureTestingModule({
      imports: [AiProductModalComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GeminiService, useValue: gemini },
        {
          provide: AiProductModalService,
          useValue: {
            isOpen: signal(true),
            mode: signal('create'),
            getEditContext: () => null,
            close: () => {}
          }
        }
      ]
    })
    fixture = TestBed.createComponent(AiProductModalComponent)
    component = fixture.componentInstance
    ;(component as unknown as Internals).draft_.set({ ...draft })
    fixture.detectChanges()
    await fixture.whenStable() // ngModel writes the value to the picker on a microtask
    fixture.detectChanges()
  })

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement

  it('has no native select in the draft editor', () => {
    expect(root().querySelector('select')).toBeNull()
    expect(root().querySelector('app-custom-select')).not.toBeNull()
  })

  it('shows the draft base unit and lists only the fixed units (no add-option row)', () => {
    expect(root().querySelector('.custom-select-label')?.textContent?.trim()).toBe('gram')
    ;(root().querySelector('.custom-select-trigger') as HTMLElement).click()
    fixture.detectChanges()
    const options = Array.from(root().querySelectorAll('.custom-select-option')).map((o) => o.textContent?.trim())
    expect(options).toContain('kg')
    expect(options.length).toBe(10)
    expect(root().querySelector('.custom-select-option--add-new')).toBeNull()
  })

  it('choosing a unit updates the draft baseUnit', () => {
    ;(root().querySelector('.custom-select-trigger') as HTMLElement).click()
    fixture.detectChanges()
    const kg = Array.from(root().querySelectorAll('.custom-select-option')).find((o) => o.textContent?.trim() === 'kg')
    ;(kg as HTMLElement).click()
    fixture.detectChanges()
    expect((component as unknown as Internals).draft_()?.baseUnit).toBe('kg')
    expect(root().querySelector('.custom-select-label')?.textContent?.trim()).toBe('kg')
  })
})
