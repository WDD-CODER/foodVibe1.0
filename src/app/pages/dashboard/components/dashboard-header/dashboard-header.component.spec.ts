import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'

import { DashboardHeaderComponent } from './dashboard-header.component'
import { LucideAngularModule, ArrowRight } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'

describe('DashboardHeaderComponent', () => {
  let fixture: ComponentFixture<DashboardHeaderComponent>
  let component: DashboardHeaderComponent
  let mockTranslation: jasmine.SpyObj<TranslationService>

  beforeEach(async () => {
    mockTranslation = jasmine.createSpyObj('TranslationService', [
      'translate',
      'resolveUnit',
      'resolveCategory',
      'resolveAllergen',
      'resolveSectionCategory',
      'resolvePreparationCategory'
    ])
    mockTranslation.translate.and.callFake((k: string) => k)

    await TestBed.configureTestingModule({
      imports: [DashboardHeaderComponent, LucideAngularModule.pick({ ArrowRight })],
      providers: [{ provide: TranslationService, useValue: mockTranslation }]
    }).compileComponents()

    fixture = TestBed.createComponent(DashboardHeaderComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    fixture.componentRef.setInput('activeTab', 'metadata')
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('should emit overview when back button is clicked', () => {
    fixture.componentRef.setInput('activeTab', 'metadata')
    fixture.detectChanges()
    spyOn(component.tabChange, 'emit')
    fixture.debugElement.query(By.css('[data-testid="btn-back-to-dashboard"]')).nativeElement.click()
    expect(component.tabChange.emit).toHaveBeenCalledWith('overview')
  })
})
