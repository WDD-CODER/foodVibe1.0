import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { DashboardHeaderComponent } from './dashboard-header.component';
import { LucideAngularModule, ArrowRight, MapPin, Trash2, Truck } from 'lucide-angular';
import { TranslationService } from '@services/translation.service';

describe('DashboardHeaderComponent', () => {
  let fixture: ComponentFixture<DashboardHeaderComponent>;
  let component: DashboardHeaderComponent;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        DashboardHeaderComponent,
        LucideAngularModule.pick({ ArrowRight, MapPin, Trash2, Truck }),
      ],
      providers: [
        { provide: Router, useValue: router },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
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

  it('should emit overview when backToDashboard is called', () => {
    fixture.componentRef.setInput('activeTab', 'metadata');
    fixture.detectChanges();
    let emitted: string | undefined;
    component.tabChange.subscribe((t: string) => { emitted = t; });
    (component as unknown as { backToDashboard: () => void }).backToDashboard();
    expect(emitted).toBe('overview');
  });

  it('should navigate to /suppliers when goToSuppliers is called', () => {
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();
    (component as unknown as { goToSuppliers: () => void }).goToSuppliers();
    expect(router.navigate).toHaveBeenCalledWith(['/suppliers']);
  });
});
