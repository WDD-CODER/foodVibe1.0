import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, Trash2, Search } from 'lucide-angular';
import { RecipeIngredientsTableComponent } from './recipe-ingredients-table.component';

describe('RecipeIngredientsTableComponent', () => {
  let component: RecipeIngredientsTableComponent;
  let fixture: ComponentFixture<RecipeIngredientsTableComponent>;
  let fb: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeIngredientsTableComponent, ReactiveFormsModule, LucideAngularModule.pick({ Trash2, Search })],
      providers: [FormBuilder]
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    const ingredientsFormArray = fb.array([
      fb.group({
        amount_net: [0],
        name_hebrew: [''],
        referenceId: [''],
        item_type_: ['product'],
        unit: ['gram'],
        price_override_: [null]
      })
    ]);

    fixture = TestBed.createComponent(RecipeIngredientsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('ingredientsFormArray', ingredientsFormArray);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
