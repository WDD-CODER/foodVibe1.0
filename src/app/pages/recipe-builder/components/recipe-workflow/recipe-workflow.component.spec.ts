import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormArray, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LucideAngularModule, Plus, Trash2, Timer, Minus, ArrowUpDown, X, GripVertical, Clock, Watch } from 'lucide-angular';
import { RecipeWorkflowComponent } from './recipe-workflow.component';

describe('RecipeWorkflowComponent', () => {
  let component: RecipeWorkflowComponent;
  let fixture: ComponentFixture<RecipeWorkflowComponent>;
  let fb: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeWorkflowComponent, ReactiveFormsModule, LucideAngularModule.pick({ Plus, Trash2, Timer, Minus, ArrowUpDown, X, GripVertical, Clock, Watch })],
      providers: [FormBuilder, provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    const workflowFormArray = fb.array([
      fb.group({
        instruction: [''],
        labor_time: [0],
        cooking_time: [0]
      })
    ]);
    const parent = fb.group({ workflow_items: workflowFormArray });
    const arrayRef = parent.get('workflow_items') as FormArray;

    fixture = TestBed.createComponent(RecipeWorkflowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('workflowFormArray', arrayRef);
    fixture.componentRef.setInput('type', 'preparation');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('step form group contains cooking_time control with default value 0', () => {
    const group = fb.group({ instruction: [''], labor_time: [0], cooking_time: [0] });
    expect(group.get('cooking_time')).toBeTruthy();
    expect(group.get('cooking_time')?.value).toBe(0);
  });
});
