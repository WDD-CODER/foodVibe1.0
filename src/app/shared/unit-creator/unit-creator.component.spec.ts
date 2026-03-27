import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { UnitCreatorModal } from './unit-creator.component'

describe('UnitCreatorModal', () => {
  let fixture: ComponentFixture<UnitCreatorModal>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitCreatorModal],
      providers: [provideHttpClient()],
    }).compileComponents()
    fixture = TestBed.createComponent(UnitCreatorModal)
  })

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy()
  })
})
