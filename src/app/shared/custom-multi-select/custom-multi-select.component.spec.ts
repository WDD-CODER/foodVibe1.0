import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
import { CustomMultiSelectComponent } from './custom-multi-select.component';
import { TranslationService } from '@services/translation.service';

describe('CustomMultiSelectComponent', () => {
  let component: CustomMultiSelectComponent;
  let fixture: ComponentFixture<CustomMultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomMultiSelectComponent,
        LucideAngularModule.pick({ ChevronDown })
      ],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomMultiSelectComponent);
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

  it('should show chips when value is set', () => {
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' }
    ]);
    component.writeValue(['a', 'b']);
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('.custom-multi-select-chip--removable');
    expect(chips.length).toBe(2);
  });

  it('should emit valueChange when option is added', () => {
    let emitted: string[] | undefined;
    component.valueChange.subscribe((v: string[]) => { emitted = v; });
    component.writeValue([]);
    fixture.detectChanges();
    (component as unknown as { addOption: (v: string) => void }).addOption('a');
    expect(emitted).toEqual(['a']);
  });
});
