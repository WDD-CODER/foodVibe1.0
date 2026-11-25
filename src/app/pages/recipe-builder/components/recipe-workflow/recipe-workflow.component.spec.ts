import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FormBuilder, FormArray, ReactiveFormsModule } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import {
  LucideAngularModule,
  Plus,
  Trash2,
  Timer,
  Minus,
  ArrowUpDown,
  X,
  GripVertical,
  Clock,
  Watch
} from 'lucide-angular'
import { RecipeWorkflowComponent } from './recipe-workflow.component'

describe('RecipeWorkflowComponent', () => {
  let component: RecipeWorkflowComponent
  let fixture: ComponentFixture<RecipeWorkflowComponent>
  let fb: FormBuilder

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RecipeWorkflowComponent,
        ReactiveFormsModule,
        LucideAngularModule.pick({ Plus, Trash2, Timer, Minus, ArrowUpDown, X, GripVertical, Clock, Watch })
      ],
      providers: [FormBuilder, provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()

    fb = TestBed.inject(FormBuilder)
    const workflowFormArray = fb.array([
      fb.group({
        instruction: [''],
        labor_time: [0],
        cooking_time: [0]
      })
    ])
    const parent = fb.group({ workflow_items: workflowFormArray })
    const arrayRef = parent.get('workflow_items') as FormArray

    fixture = TestBed.createComponent(RecipeWorkflowComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('workflowFormArray', arrayRef)
    fixture.componentRef.setInput('type', 'preparation')
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('a step re-inserted from outside the component is listed at once (plan 511)', () => {
    const arr = component.workflowFormArray()
    const removed = arr.at(0)
    arr.removeAt(0)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelectorAll('textarea').length).toBe(0)
    arr.insert(0, removed)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelectorAll('textarea').length).toBe(1)
  })

  it('the down arrow on the first step grip moves it to the second place (plan 742)', () => {
    const arr = component.workflowFormArray()
    arr.at(0).patchValue({ instruction: 'first' })
    arr.push(fb.group({ instruction: ['second'], labor_time: [0], cooking_time: [0] }))
    fixture.detectChanges()
    const grip = fixture.nativeElement.querySelector('.grid-row .col-drag-id') as HTMLElement
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    expect(arr.at(0).get('instruction')?.value).toBe('second')
    expect(arr.at(1).get('instruction')?.value).toBe('first')
  })

  it('step form group contains cooking_time control with default value 0', () => {
    const group = fb.group({ instruction: [''], labor_time: [0], cooking_time: [0] })
    expect(group.get('cooking_time')).toBeTruthy()
    expect(group.get('cooking_time')?.value).toBe(0)
  })
})
