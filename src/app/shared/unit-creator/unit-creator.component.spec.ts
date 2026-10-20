import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { UnitCreatorModal } from './unit-creator.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('UnitCreatorModal', () => {
  let fixture: ComponentFixture<UnitCreatorModal>
  const isCreatorOpen_ = signal(false)
  const creatorPrefillName_ = signal('')
  const creatorForProduct_ = signal<{ name: string; baseUnit: string } | null>(null)
  const dictionary: Record<string, string> = {
    unit_creator_title_for_product: 'יחידה חדשה עבור {{name}}',
    unit_amount_for_product: 'כמה שוקלת {{unit}} אחת של {{name}}?'
  }

  beforeEach(async () => {
    isCreatorOpen_.set(false)
    creatorPrefillName_.set('')
    creatorForProduct_.set(null)
    const registry = jasmine.createSpyObj('UnitRegistryService', ['closeUnitCreator', 'registerUnit'], {
      isCreatorOpen_,
      creatorPrefillName_,
      creatorForProduct_,
      allUnitKeys_: signal(['gram', 'kg'])
    })
    await TestBed.configureTestingModule({
      imports: [UnitCreatorModal, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        { provide: UnitRegistryService, useValue: registry },
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => dictionary[k] ?? k, resolveUnit: () => null }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(UnitCreatorModal)
  })

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy()
  })

  /** Plan 418 — the window opens with the name the chef typed in the dropdown. */
  async function nameFieldAfterOpen(prefill: string): Promise<string> {
    creatorPrefillName_.set(prefill)
    isCreatorOpen_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const input = fixture.nativeElement.querySelector('#unit-creator-name') as HTMLInputElement
    return input.value
  }

  it('shows the typed name in its name field', async () => {
    expect(await nameFieldAfterOpen('צנצנת')).toBe('צנצנת')
  })

  it('opens with an empty name field when nothing was typed', async () => {
    expect(await nameFieldAfterOpen('')).toBe('')
  })

  /** Plan 423 — product mode asks this product's own amount, in the product's base unit by default. */
  it('in product mode: titles with the product name and defaults the basis to the product base unit', async () => {
    creatorForProduct_.set({ name: 'בצל צהוב', baseUnit: 'kg' })
    creatorPrefillName_.set('צנצנת')
    isCreatorOpen_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('h3')?.textContent?.trim()).toBe('יחידה חדשה עבור בצל צהוב')
    expect(el.querySelector('.unit-creator-amount label')?.textContent?.trim()).toBe('כמה שוקלת צנצנת אחת של בצל צהוב?')
    expect((fixture.componentInstance as unknown as { basisUnit_: () => string }).basisUnit_()).toBe('kg')
    expect((el.querySelector('#unit-creator-amount') as HTMLInputElement).value).toBe('0')
  })

  it('without product mode the title and amount stay the plain ones', async () => {
    isCreatorOpen_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect((fixture.nativeElement as HTMLElement).querySelector('h3')?.textContent?.trim()).toBe('unit_creator_title')
  })
})
