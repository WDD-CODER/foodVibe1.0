import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
import { CustomSelectComponent } from './custom-select.component';
import { TranslationService } from '@services/translation.service';

describe('CustomSelectComponent', () => {
  let component: CustomSelectComponent;
  let fixture: ComponentFixture<CustomSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomSelectComponent,
        LucideAngularModule.pick({ ChevronDown })
      ],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' }
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show selected label when value is set', () => {
    component.writeValue('b');
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.custom-select-label');
    expect(label?.textContent?.trim()).toBe('Option B');
  });

  it('should emit valueChange when option is selected', () => {
    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => { emitted = v; });
    component.writeValue('');
    fixture.detectChanges();
    (component as unknown as { select: (v: string) => void }).select('a');
    expect(emitted).toBe('a');
  });
});
