import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslationKeyModalComponent } from './translation-key-modal.component';
import { TranslationKeyModalService } from '@services/translation-key-modal.service';

describe('TranslationKeyModalComponent', () => {
  let component: TranslationKeyModalComponent;
  let fixture: ComponentFixture<TranslationKeyModalComponent>;
  let mockModalService: {
    isOpen_: WritableSignal<boolean>;
    hebrewLabel_: WritableSignal<string>;
    context_: WritableSignal<'category' | 'allergen' | 'supplier' | 'unit' | 'generic'>;
    save: jasmine.Spy;
    cancel: jasmine.Spy;
    validateKey: jasmine.Spy;
  };

  beforeEach(async () => {
    mockModalService = {
      isOpen_: signal(false),
      hebrewLabel_: signal(''),
      context_: signal<'category' | 'allergen' | 'supplier' | 'unit' | 'generic'>('generic'),
      save: jasmine.createSpy('save'),
      cancel: jasmine.createSpy('cancel'),
      validateKey: jasmine.createSpy('validateKey').and.returnValue({ valid: true })
    };

    await TestBed.configureTestingModule({
      imports: [TranslationKeyModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslationKeyModalService, useValue: mockModalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TranslationKeyModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call save with key and hebrew when both are provided', () => {
    component['englishKey_'].set('test_key');
    mockModalService.hebrewLabel_.set('מבחן');
    (component as any).save();
    expect(mockModalService.save).toHaveBeenCalledWith('test_key', 'מבחן');
  });

  it('should call cancel when cancel is invoked', () => {
    (component as any).cancel();
    expect(mockModalService.cancel).toHaveBeenCalled();
  });

  it('should set validation error when validateKey returns invalid', () => {
    mockModalService.validateKey.and.returnValue({ valid: false, error: 'Invalid key' });
    component['englishKey_'].set('test');
    mockModalService.hebrewLabel_.set('מבחן');
    (component as any).save();
    expect(component['validationError_']()).toBe('Invalid key');
    expect(mockModalService.save).not.toHaveBeenCalled();
  });
});
