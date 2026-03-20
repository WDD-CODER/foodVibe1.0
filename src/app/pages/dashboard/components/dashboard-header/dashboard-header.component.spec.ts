import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { DashboardHeaderComponent } from './dashboard-header.component';
import { LucideAngularModule, ArrowRight, MapPin, Trash2, Truck } from 'lucide-angular';
import { TranslationService } from '@services/translation.service';

describe('DashboardHeaderComponent', () => {
  let fixture: ComponentFixture<DashboardHeaderComponent>;
  let component: DashboardHeaderComponent;
  let router: jasmine.SpyObj<Router>;
  let mockTranslation: jasmine.SpyObj<TranslationService>;

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

    mockTranslation = jasmine.createSpyObj('TranslationService', [
      'translate', 'resolveUnit', 'resolveCategory', 'resolveAllergen',
      'resolveSectionCategory', 'resolvePreparationCategory',
    ]);
    mockTranslation.translate.and.callFake((k: string) => k);

    await TestBed.configureTestingModule({
      imports: [
        DashboardHeaderComponent,
        LucideAngularModule.pick({ ArrowRight, MapPin, Trash2, Truck }),
      ],
      providers: [
        { provide: Router, useValue: router },
        { provide: TranslationService, useValue: mockTranslation },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardHeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should emit overview when back button is clicked', () => {
    fixture.componentRef.setInput('activeTab', 'metadata');
    fixture.detectChanges();
    spyOn(component.tabChange, 'emit');
    fixture.debugElement.query(By.css('[data-testid="btn-back-to-dashboard"]')).nativeElement.click();
    expect(component.tabChange.emit).toHaveBeenCalledWith('overview');
  });

  it('should navigate to /suppliers when suppliers button is clicked', () => {
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();
    fixture.debugElement.query(By.css('[data-testid="btn-nav-suppliers"]')).nativeElement.click();
    expect(router.navigate).toHaveBeenCalledWith(['/suppliers']);
  });

  it('should show back button when activeTab is metadata', () => {
    fixture.componentRef.setInput('activeTab', 'metadata');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-back-to-dashboard"]'))).not.toBeNull();
  });

  it('should hide back button and show metadata button when activeTab is overview', () => {
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-back-to-dashboard"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-nav-metadata"]'))).not.toBeNull();
  });

  it('should emit metadata when core-settings button is clicked', () => {
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();
    spyOn(component.tabChange, 'emit');
    fixture.debugElement.query(By.css('[data-testid="btn-nav-metadata"]')).nativeElement.click();
    expect(component.tabChange.emit).toHaveBeenCalledWith('metadata');
  });

  it('should emit venues when venue-list button is clicked', () => {
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();
    spyOn(component.tabChange, 'emit');
    fixture.debugElement.query(By.css('[data-testid="btn-nav-venues"]')).nativeElement.click();
    expect(component.tabChange.emit).toHaveBeenCalledWith('venues');
  });

  it('should emit trash when trash button is clicked', () => {
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();
    spyOn(component.tabChange, 'emit');
    fixture.debugElement.query(By.css('[data-testid="btn-nav-trash"]')).nativeElement.click();
    expect(component.tabChange.emit).toHaveBeenCalledWith('trash');
  });

  it('should apply active class to venues button when activeTab is venues', () => {
    fixture.componentRef.setInput('activeTab', 'venues');
    fixture.detectChanges();
    const venuesBtn = fixture.debugElement.query(By.css('[data-testid="btn-nav-venues"]'));
    expect(venuesBtn.nativeElement.classList.contains('active')).toBeTrue();
  });

  it('should apply active class to trash button when activeTab is trash', () => {
    fixture.componentRef.setInput('activeTab', 'trash');
    fixture.detectChanges();
    const trashBtn = fixture.debugElement.query(By.css('[data-testid="btn-nav-trash"]'));
    expect(trashBtn.nativeElement.classList.contains('active')).toBeTrue();
  });
});
