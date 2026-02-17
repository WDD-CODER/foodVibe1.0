import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Ingredient } from '@models/ingredient.model';
import { Recipe, RecipeStep, MiseCategory } from '@models/recipe.model';
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
  private fb = inject(FormBuilder);
  private readonly state_ = inject(KitchenStateService);
  private readonly route_ = inject(ActivatedRoute);

  //SIGNALS
  protected isSaving_ = signal(false);
  private recipeId_ = signal<string | null>(null);
  isSubmitted = false;

  //COMPUTED
  protected totalCost_ = computed(() => {
    const ingredients = this.recipeForm_.get('ingredients')?.value || [];
    return ingredients.reduce((acc: number, ing: any) => acc + (ing.total_cost || 0), 0);
  });
  protected recipeType_ = computed<'preparation' | 'dish'>(() => {
    const value = this.recipeForm_.get('recipe_type')?.value;
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

  protected portions_ = toSignal(
    this.recipeForm_.get('serving_portions')!.valueChanges.pipe(
      startWith(this.recipeForm_.get('serving_portions')?.value ?? 1)
    ),
    { initialValue: 1 }
  );

  ngOnInit(): void {
    const recipe = this.route_.snapshot.data['recipe'] as Recipe | null;
    if (recipe) {
      this.recipeId_.set(recipe._id);
      this.patchFormFromRecipe(recipe);
    }
    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow();
    }
  }

  private patchFormFromRecipe(recipe: Recipe): void {
    const isDish = !!recipe.mise_categories_?.length;
    this.recipeForm_.patchValue({
      name_hebrew: recipe.name_hebrew,
      recipe_type: isDish ? 'dish' : 'preparation',
      serving_portions: isDish ? recipe.yield_amount_ : 1,
      total_weight_g: 0,
      total_cost: 0
    });

    const yieldConv = this.yieldConversionsArray.at(0);
    if (yieldConv && !isDish) {
      yieldConv.patchValue({ amount: recipe.yield_amount_, unit: recipe.yield_unit_ });
    }

    this.ingredientsArray.clear();
    recipe.ingredients_.forEach(ing => {
      const item = this.state_.products_().find(p => p._id === ing.referenceId)
        ?? this.state_.recipes_().find(r => r._id === ing.referenceId);
      const itemForGroup = item ? {
        _id: ing.referenceId,
        name_hebrew: item.name_hebrew,
        item_type_: ing.type,
        base_unit_: (item as { base_unit_?: string }).base_unit_ ?? ing.unit_,
        yield_percentage: 1
      } : null;
      this.ingredientsArray.push(this.createIngredientGroup(itemForGroup as { _id: string; name_hebrew: string; item_type_: string; base_unit_: string; yield_percentage?: number } | null));
      const lastGroup = this.ingredientsArray.at(this.ingredientsArray.length - 1);
      lastGroup.patchValue({
        referenceId: ing.referenceId,
        item_type: ing.type,
        amount_net: ing.amount_,
        unit: ing.unit_,
        total_cost: ing.calculatedCost_ ?? 0
      });
    });

    this.workflowArray.clear();
    if (recipe.mise_categories_) {
      recipe.mise_categories_.forEach(cat => {
        const itemsArray = this.fb.array(
          cat.items.map(it => this.fb.group({
            item_name: [it.item_name, Validators.required],
            unit: [it.unit, Validators.required]
          }))
        );
        this.workflowArray.push(this.fb.group({
          category_name: [cat.category_name, Validators.required],
          items: itemsArray
        }));
      });
    } else {
      recipe.steps_.forEach((step, i) => {
        this.workflowArray.push(this.fb.group({
          order: [step.order_ ?? i + 1],
          instruction: [step.instruction_, Validators.required],
          labor_time: [step.labor_time_minutes_ ?? 0]
        }));
      });
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

    this.isSaving_.set(true);
    const recipe = this.buildRecipeFromForm();

    this.state_.saveRecipe(recipe).subscribe({
      next: () => {
        this.isSaving_.set(false);
        this.isSubmitted = true;
        this.recipeForm_.markAsPristine();
      },
      error: () => {
        this.isSaving_.set(false);
      }
    });
  }

  private buildRecipeFromForm(): Recipe {
    const raw = this.recipeForm_.getRawValue() as Record<string, unknown>;
    const isDish = raw['recipe_type'] === 'dish';

    type IngRow = { referenceId?: string; item_type?: string; amount_net?: number; unit?: string; total_cost?: number };
    const rawIngredients = (raw['ingredients'] || []) as IngRow[];
    const ingredients: Ingredient[] = rawIngredients
      .filter(ing => !!ing?.referenceId)
      .map(ing => ({
        _id: 'ing_' + Math.random().toString(36).slice(2, 9),
        referenceId: ing.referenceId!,
        type: (ing.item_type === 'recipe' ? 'recipe' : 'product') as 'product' | 'recipe',
        amount_: ing.amount_net ?? 0,
        unit_: ing.unit ?? '',
        calculatedCost_: ing.total_cost ?? 0
      }));

    const steps: RecipeStep[] = [];
    let miseCategories: MiseCategory[] | undefined;

    if (isDish) {
      type CatRow = { category_name?: string; items?: { item_name?: string; unit?: string }[] };
      miseCategories = ((raw['workflow_items'] || []) as CatRow[]).map(cat => ({
        category_name: cat.category_name ?? '',
        items: (cat.items || []).map(it => ({
          item_name: it.item_name ?? '',
          unit: it.unit ?? ''
        }))
      }));
    } else {
      type StepRow = { order?: number; instruction?: string; labor_time?: number };
      ((raw['workflow_items'] || []) as StepRow[]).forEach((step, i) => {
        steps.push({
          order_: step?.order ?? i + 1,
          instruction_: step?.instruction ?? '',
          labor_time_minutes_: step?.labor_time ?? 0
        });
      });
    }

    const yieldConv = (raw['yield_conversions'] as { amount?: number; unit?: string }[])?.[0];
    const yieldAmount = isDish ? ((raw['serving_portions'] as number) ?? 1) : (yieldConv?.amount ?? 0);
    const yieldUnit = isDish ? 'מנה' : (yieldConv?.unit ?? 'gr');

    return {
      _id: (this.recipeId_() ?? '') as string,
      name_hebrew: (raw['name_hebrew'] as string) ?? '',
      ingredients_: ingredients,
      steps_: steps,
      yield_amount_: yieldAmount,
      yield_unit_: yieldUnit,
      default_station_: '',
      is_approved_: true,
      ...(miseCategories && { mise_categories_: miseCategories })
    };
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