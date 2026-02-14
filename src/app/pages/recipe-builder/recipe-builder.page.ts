import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Ingredient } from '@models/ingredient.model';
import { RecipeStep } from '@models/recipe.model';
import { RecipeHeaderComponent } from './components/recipe-header/recipe-header.component';
import { RecipeIngredientsTableComponent } from './components/recipe-ingredients-table/recipe-ingredients-table.component';
import { RecipeWorkflowComponent } from './components/recipe-workflow/recipe-workflow.component';

@Component({
  selector: 'app-recipe-builder-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RecipeHeaderComponent,
    RecipeIngredientsTableComponent,
    RecipeWorkflowComponent,
    LucideAngularModule
  ],
  templateUrl: './recipe-builder.page.html',
  styleUrl: './recipe-builder.page.scss'
})
export class RecipeBuilderPage implements OnInit {
  //INJECTIONS
  private fb = inject(FormBuilder);
  private readonly state_ = inject(KitchenStateService);

  //SIGNALS
  protected isSaving_ = signal(false);

  //COMPUTED
  protected totalCost_ = computed(() => {
    const ingredients = this.recipeForm_.get('ingredients')?.value || [];
    return ingredients.reduce((acc: number, ing: any) => acc + (ing.total_cost || 0), 0);
  });
  protected recipeType_ = computed<'preparation' | 'dish'>(() => {
    const value = this.recipeForm_.get('recipe_type')?.value;
    // This "Type Guard" ensures the value is exactly what the child component needs
    return (value === 'dish') ? 'dish' : 'preparation';
  });

  protected recipeForm_ = this.fb.group({
    name_hebrew: ['', Validators.required],
    recipe_type: ['preparation'],
    serving_portions: [1, [Validators.required, Validators.min(1)]],
    yield_conversions: this.fb.array([
      this.fb.group({ amount: [0], unit: ['gr'] })
    ]),
    ingredients: this.fb.array([]),
    workflow_items: this.fb.array([]),
    total_weight_g: [0],
    total_cost: [0]
  });

  ngOnInit(): void {
    // Ensure the recipe starts with one empty ingredient row
    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow();
    }
  }



  //GETTERS
  get yieldConversionsArray() {
    return this.recipeForm_.get('yield_conversions') as FormArray;
  }

  get workflowArray() {
    return this.recipeForm_.get('workflow_items') as FormArray;
  }

  get ingredientsArray() {
    return this.recipeForm_.get('ingredients') as FormArray;
  }

  //CREATE

  private createStepGroup(order: number) {
    return this.fb.group({
      order: [order],
      instruction: ['', Validators.required],
      labor_time: [0]
    });
  }

  private createIngredientGroup(item: any = null) {
    return this.fb.group({
      referenceId: [item?._id || null],
      item_type: [item?.item_type_ || null], // product | recipe
      name_hebrew: [item?.name_hebrew || ''],
      amount_net: [item ? 1 : null, [Validators.required, Validators.min(0)]],
      yield_percentage: [item?.yield_percentage || 1],
      unit: [item?.base_unit_ || 'gr'],
      total_cost: [{ value: 0, disabled: true }]
    });
  }

  private createMiseCategory(name: string = '') {
    return this.fb.group({
      category_name: [name, Validators.required],
      items: this.fb.array([]) // Array of MiseItemGroups
    });
  }

  private createMiseItem(name: string = '', unit: string = 'unit') {
    return this.fb.group({
      item_name: [name, Validators.required],
      unit: [unit, Validators.required]
    });
  }

  private createMiseCategoryGroup(categoryName: string = '') {
    return this.fb.group({
      category_name: [categoryName, Validators.required],
      items: this.fb.array([]) // This will hold 'MiseItem' groups
    });
  }

  private createMiseItemGroup(itemName: string = '', unit: string = '') {
    return this.fb.group({
      item_name: [itemName, Validators.required],
      unit: [unit, Validators.required] // Triggers Unit Creator if empty
    });
  }

  addNewStep(): void {
    const nextOrder = this.workflowArray.length + 1;
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish';

    // Logic: Add a Category if it's a Dish, or a Step if it's a Prep
    const newGroup = isDish
      ? this.createMiseCategoryGroup()
      : this.createStepGroup(nextOrder);

    this.workflowArray.push(newGroup);
  }

  //UPDATE

  addNewIngredientRow(): void {
    const newGroup = this.createIngredientGroup();
    this.ingredientsArray.push(newGroup);
    this.ingredientsArray.updateValueAndValidity();
    this.recipeForm_.get('ingredients')?.markAsDirty();
  }

  saveRecipe(): void {
    if (this.recipeForm_.invalid) {
      this.recipeForm_.markAllAsTouched();
      return;
    }

    const finalRecipeData = {
      ...this.recipeForm_.getRawValue(),
      lastUpdated: new Date()
    };

    console.log('Saving Recipe:', finalRecipeData);
    this.isSaving_.set(true);
    setTimeout(() => this.isSaving_.set(false), 1000);
  }

  //DELETE

  removeIngredient(index: number): void {
    this.ingredientsArray.removeAt(index);
  }

  deleteStep(index: number): void {
    this.workflowArray.removeAt(index);

    if (this.recipeForm_.get('recipe_type')?.value === 'preparation') {
      this.workflowArray.controls.forEach((group, i) => {
        group.get('order')?.setValue(i + 1);
      });
    }
  }
}