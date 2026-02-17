import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronDown, Plus } from 'lucide-angular';
import { RecipeHeaderComponent } from './recipe-header.component';
import { UnitRegistryService } from '@services/unit-registry.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { signal } from '@angular/core';

describe('RecipeHeaderComponent', () => {
  let component: RecipeHeaderComponent;
  let fixture: ComponentFixture<RecipeHeaderComponent>;
  let fb: FormBuilder;

  beforeEach(async () => {
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion', 'openUnitCreator'], {
      allUnitKeys_: signal(['gram', 'kg'])
    });
    unitRegistrySpy.getConversion.and.returnValue(1);

    await TestBed.configureTestingModule({
      imports: [RecipeHeaderComponent, ReactiveFormsModule, LucideAngularModule.pick({ ChevronDown, Plus })],
      providers: [
        FormBuilder,
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: KitchenStateService, useValue: {} }
      ]
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    const recipeForm = fb.group({
      recipe_type: ['preparation'],
      yield_conversions: fb.array([fb.group({ unit: ['gram'], amount: [1] })]),
      name_hebrew: [''],
      image_url: [null],
      total_weight_g: [0]
    });

    fixture = TestBed.createComponent(RecipeHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', recipeForm);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
