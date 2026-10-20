import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { UnitCreatorModal } from './unit-creator.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('UnitCreatorModal', () => {
  let fixture: ComponentFixture<UnitCreatorModal>
  const isCreatorOpen_ = signal(false)
  const creatorPrefillName_ = signal('')

  beforeEach(async () => {
    isCreatorOpen_.set(false)
    creatorPrefillName_.set('')
    const registry = jasmine.createSpyObj('UnitRegistryService', ['closeUnitCreator', 'registerUnit'], {
      isCreatorOpen_,
      creatorPrefillName_,
      allUnitKeys_: signal(['gram', 'kg'])
    })
    await TestBed.configureTestingModule({
      imports: [UnitCreatorModal, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [provideHttpClient(), { provide: UnitRegistryService, useValue: registry }]
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
})
