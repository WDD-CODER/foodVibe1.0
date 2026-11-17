import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Business } from '@schemas/entities'
import { BusinessService } from '@services/business.service'
import { TranslationService } from '@services/translation.service'
import { AiExamplesShareComponent } from './ai-examples-share.component'

describe('AiExamplesShareComponent (plans 618, 620)', () => {
  let fixture: ComponentFixture<AiExamplesShareComponent>
  let business: WritableSignal<Business | null>

  const base: Business = {
    _id: 'b1',
    name: 'b',
    ownerId: 'o1',
    createdAt: 1,
    internal: false,
    lastSyncedMasterVersion: 0
  }

  const chip = (): HTMLElement => fixture.nativeElement.querySelector('span.c-chip.c-chip--tap.is-locked')

  beforeEach(async () => {
    business = signal<Business | null>(base)
    await TestBed.configureTestingModule({
      imports: [AiExamplesShareComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessService, useValue: { business_: business } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(AiExamplesShareComponent)
    fixture.detectChanges()
  })

  it('shows the shared text by default', () => {
    expect(chip().textContent?.trim()).toBe('metadata_ai_state_shared')
  })

  it('shows the private text when aiPrivate is true', () => {
    business.set({ ...base, aiPrivate: true })
    fixture.detectChanges()
    expect(chip().textContent?.trim()).toBe('metadata_ai_state_private')
  })

  it('carries the tooltip as title, labels the state with it, and has no input', () => {
    expect(chip().getAttribute('title')).toBe('metadata_ai_private_tooltip')
    expect(chip().getAttribute('aria-label')).toBe('metadata_ai_state_shared — metadata_ai_private_tooltip')
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(0)
  })
})
