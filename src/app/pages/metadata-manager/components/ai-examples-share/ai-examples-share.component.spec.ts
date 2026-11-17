import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Business } from '@schemas/entities'
import { BusinessService } from '@services/business.service'
import { TranslationService } from '@services/translation.service'
import { AiExamplesShareComponent } from './ai-examples-share.component'

describe('AiExamplesShareComponent (plan 618)', () => {
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

  const box = (): HTMLInputElement => fixture.nativeElement.querySelector('.c-chip--toggle input')

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

  it('is ticked and disabled when the business is not private', () => {
    expect(box().checked).toBeTrue()
    expect(box().disabled).toBeTrue()
  })

  it('is unticked and disabled when aiPrivate is true', () => {
    business.set({ ...base, aiPrivate: true })
    fixture.detectChanges()
    expect(box().checked).toBeFalse()
    expect(box().disabled).toBeTrue()
  })
})
