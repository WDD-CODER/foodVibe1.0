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

  it('should not render a back button (the tab-chips "dashboard" chip replaces it, plan 367)', () => {
    fixture.componentRef.setInput('activeTab', 'metadata')
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('button'))).toBeNull()
  })

  it('titles the header with the active tab, not "dashboard" again (plan 353)', () => {
    fixture.componentRef.setInput('activeTab', 'metadata')
    fixture.detectChanges()
    const h1s = fixture.debugElement.queryAll(By.css('h1'))
    expect(h1s.length).toBe(1)
    expect((h1s[0].nativeElement as HTMLElement).textContent?.trim()).toBe('metadata_manager')
  })
})
