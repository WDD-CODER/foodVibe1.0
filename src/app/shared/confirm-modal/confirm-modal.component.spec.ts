import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmModalComponent } from './confirm-modal.component';
import { ConfirmModalService } from '@services/confirm-modal.service';

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent;
  let fixture: ComponentFixture<ConfirmModalComponent>;
  let mockModalService: {
    isOpen: WritableSignal<boolean>;
    message: WritableSignal<string>;
    saveLabel: WritableSignal<string>;
    variant: () => string;
    choose: jasmine.Spy;
  };

  beforeEach(async () => {
    const isOpen = signal(false);
    const message = signal('');
    const saveLabel = signal('save');
    const variant = signal<'default' | 'danger' | 'warning'>('default');
    mockModalService = {
      isOpen,
      message,
      saveLabel,
      variant: variant as () => string,
      choose: jasmine.createSpy('choose')
    };

    await TestBed.configureTestingModule({
      imports: [ConfirmModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmModalService, useValue: mockModalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call choose(false) when cancel is clicked', () => {
    mockModalService.isOpen.set(true);
    fixture.detectChanges();
    const cancelBtn = fixture.nativeElement.querySelector('.c-btn-ghost');
    cancelBtn?.click();
    expect(mockModalService.choose).toHaveBeenCalledWith(false);
  });

  it('should call choose(true) when confirm is clicked', () => {
    mockModalService.isOpen.set(true);
    fixture.detectChanges();
    const confirmBtn = fixture.nativeElement.querySelector('.c-btn-primary');
    confirmBtn?.click();
    expect(mockModalService.choose).toHaveBeenCalledWith(true);
  });
});
