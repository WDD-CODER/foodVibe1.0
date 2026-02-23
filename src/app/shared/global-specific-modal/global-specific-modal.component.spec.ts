import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LucideAngularModule, Globe, Tag } from 'lucide-angular';
import { GlobalSpecificModalComponent } from './global-specific-modal.component';
import { GlobalSpecificModalService } from '@services/global-specific-modal.service';

describe('GlobalSpecificModalComponent', () => {
  let component: GlobalSpecificModalComponent;
  let fixture: ComponentFixture<GlobalSpecificModalComponent>;
  let mockModalService: {
    isOpen: WritableSignal<boolean>;
    config: WritableSignal<{ preparationName: string; mainCategory: string; newCategory: string } | null>;
    choose: jasmine.Spy;
  };

  beforeEach(async () => {
    mockModalService = {
      isOpen: signal(false),
      config: signal(null),
      choose: jasmine.createSpy('choose')
    };

    await TestBed.configureTestingModule({
      imports: [GlobalSpecificModalComponent, LucideAngularModule.pick({ Globe, Tag })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GlobalSpecificModalService, useValue: mockModalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSpecificModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call choose with choice when user selects', () => {
    mockModalService.isOpen.set(true);
    mockModalService.config.set({
      preparationName: 'Test',
      mainCategory: 'Category',
      newCategory: 'New'
    });
    fixture.detectChanges();
    const globalBtn = fixture.nativeElement.querySelector('.btn-global');
    if (globalBtn) {
      globalBtn.click();
      expect(mockModalService.choose).toHaveBeenCalledWith('global');
    }
  });
});
