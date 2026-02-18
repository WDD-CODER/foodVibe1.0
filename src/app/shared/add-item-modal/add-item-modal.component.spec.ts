import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AddItemModalComponent } from './add-item-modal.component';
import { AddItemModalService } from '@services/add-item-modal.service';

describe('AddItemModalComponent', () => {
  let component: AddItemModalComponent;
  let fixture: ComponentFixture<AddItemModalComponent>;
  let mockModalService: {
    isOpen_: WritableSignal<boolean>;
    config: WritableSignal<{ title: string; label: string; saveLabel: string } | null>;
    save: jasmine.Spy;
    cancel: jasmine.Spy;
  };

  beforeEach(async () => {
    mockModalService = {
      isOpen_: signal(false),
      config: signal(null),
      save: jasmine.createSpy('save'),
      cancel: jasmine.createSpy('cancel')
    };

    await TestBed.configureTestingModule({
      imports: [AddItemModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AddItemModalService, useValue: mockModalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddItemModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call save with value when save is invoked', () => {
    component['value_'].set('test value');
    (component as any).save();
    expect(mockModalService.save).toHaveBeenCalledWith('test value');
  });

  it('should call cancel when cancel is invoked', () => {
    (component as any).cancel();
    expect(mockModalService.cancel).toHaveBeenCalled();
  });

  it('should reset value and call cancel when resetAndClose is invoked', () => {
    component['value_'].set('something');
    (component as any).resetAndClose();
    expect(component['value_']()).toBe('');
    expect(mockModalService.cancel).toHaveBeenCalled();
  });
});
