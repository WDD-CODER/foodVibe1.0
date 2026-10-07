import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'

import { DashboardHeaderComponent } from './dashboard-header.component'
import { LucideAngularModule, ArrowRight } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { provideRouter } from '@angular/router'

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
      providers: [provideRouter([]), { provide: TranslationService, useValue: mockTranslation }]
    }).compileComponents()

    fixture = TestBed.createComponent(DashboardHeaderComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    fixture.componentRef.setInput('activeTab', 'metadata')
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('titles the header with the active tab and shows no back button (plan 353)', () => {
    fixture.componentRef.setInput('activeTab', 'metadata')
    fixture.detectChanges()
    const h1 = fixture.debugElement.query(By.css('h1.ph-title')).nativeElement as HTMLElement
    expect(h1.textContent?.trim()).toBe('metadata_manager')
    expect(fixture.debugElement.query(By.css('button'))).toBeNull()
  })
})
