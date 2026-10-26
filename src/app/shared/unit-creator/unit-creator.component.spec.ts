import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { UnitCreatorModal } from './unit-creator.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { TranslationService } from '@services/translation.service'
import { KeyResolutionService } from '@services/key-resolution.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('UnitCreatorModal', () => {
  let fixture: ComponentFixture<UnitCreatorModal>
  let keyResolution: jasmine.SpyObj<KeyResolutionService>
  let registry: jasmine.SpyObj<UnitRegistryService>
  const isCreatorOpen_ = signal(false)
  const creatorPrefillName_ = signal('')
  const creatorForProduct_ = signal<{ name: string; baseUnit: string } | null>(null)
  const dictionary: Record<string, string> = {
    unit_creator_title_for_product: 'יחידה חדשה עבור {{name}}',
    unit_amount_in_base_for_product: 'כמה {{base}} יש ב{{unit}} אחת של {{name}}?',
    kg: 'ק"ג',
    gram: 'גרם',
    base_unit: 'יחידת בסיס'
  }

  beforeEach(async () => {
    isCreatorOpen_.set(false)
    creatorPrefillName_.set('')
    creatorForProduct_.set(null)
    keyResolution = jasmine.createSpyObj('KeyResolutionService', ['ensureKeyForContext'])
    keyResolution.ensureKeyForContext.and.resolveTo('k')
    registry = jasmine.createSpyObj('UnitRegistryService', ['closeUnitCreator', 'registerUnit'], {
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
        { provide: KeyResolutionService, useValue: keyResolution },
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
    expect(el.querySelector('.unit-creator-amount label')?.textContent?.trim()).toBe(
      'כמה ק"ג יש בצנצנת אחת של בצל צהוב?'
    )
    expect((fixture.componentInstance as unknown as { basisUnit_: () => string }).basisUnit_()).toBe('kg')
    expect((el.querySelector('#unit-creator-amount') as HTMLInputElement).value).toBe('')
  })

  it('without product mode the title and amount stay the plain ones', async () => {
    isCreatorOpen_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect((fixture.nativeElement as HTMLElement).querySelector('h3')?.textContent?.trim()).toBe('unit_creator_title')
  })

  /** Plan 461 — the question follows the base unit chosen in the window. */
  it('in product mode: the question names the chosen base unit', async () => {
    creatorForProduct_.set({ name: 'פטרוזיליה', baseUnit: 'gram' })
    creatorPrefillName_.set('צנצנת')
    isCreatorOpen_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('.unit-creator-amount label')?.textContent?.trim()).toBe(
      'כמה גרם יש בצנצנת אחת של פטרוזיליה?'
    )
  })

  /** Plan 461 — Tab only moves focus: no save, no name-key window. */
  it('Tab in the name box neither saves nor opens the name-key window', async () => {
    creatorPrefillName_.set('צנצנת')
    isCreatorOpen_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const input = fixture.nativeElement.querySelector('#unit-creator-name') as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    fixture.detectChanges()
    expect(keyResolution.ensureKeyForContext).not.toHaveBeenCalled()
    expect(registry.registerUnit).not.toHaveBeenCalled()
  })

  it('Enter in the quantity box saves only when name, quantity and base unit are filled', async () => {
    registry.registerUnit.and.resolveTo({ success: true } as never)
    creatorForProduct_.set({ name: 'פטרוזיליה', baseUnit: 'gram' })
    creatorPrefillName_.set('צנצנת')
    isCreatorOpen_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const comp = fixture.componentInstance
    const amount = fixture.nativeElement.querySelector('#unit-creator-amount') as HTMLInputElement
    const enter = () =>
      amount.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    enter()
    expect(registry.registerUnit).not.toHaveBeenCalled()
    comp.newUnitValue_.set(200)
    enter()
    expect(registry.registerUnit).toHaveBeenCalledWith('צנצנת', 200, 'gram')
  })
})
