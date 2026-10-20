import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { UnitCreatorModal } from './unit-creator.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('UnitCreatorModal', () => {
  let fixture: ComponentFixture<UnitCreatorModal>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitCreatorModal, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [provideHttpClient()]
    }).compileComponents()
    fixture = TestBed.createComponent(UnitCreatorModal)
  })

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy()
  })

  // Plan 377 — the name typed in a unit picker carries into the creator.
  it('opens with the name the user typed in the unit picker', () => {
    TestBed.inject(UnitRegistryService).openUnitCreator({ name: 'צנצנת' })
    fixture.detectChanges()
    expect(fixture.componentInstance.newUnitName_()).toBe('צנצנת')
  })

  it('opens with an empty name when nothing was typed', () => {
    TestBed.inject(UnitRegistryService).openUnitCreator()
    fixture.detectChanges()
    expect(fixture.componentInstance.newUnitName_()).toBe('')
  })
})
