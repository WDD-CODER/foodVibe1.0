import { Component, inject, signal, computed, OnInit, DestroyRef, afterNextRender, Injector, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { UserMsgService } from '@services/user-msg.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import { VersionHistoryService } from '@services/version-history.service';
import type { VersionEntityType } from '@services/version-history.service';
import { Ingredient } from '@models/ingredient.model';
import { Recipe, RecipeStep, MiseCategory, FlatPrepItem, PrepCategory } from '@models/recipe.model';
import { RecipeHeaderComponent } from './components/recipe-header/recipe-header.component';
import { RecipeIngredientsTableComponent } from './components/recipe-ingredients-table/recipe-ingredients-table.component';
import { RecipeWorkflowComponent } from './components/recipe-workflow/recipe-workflow.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-recipe-builder-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RecipeHeaderComponent,
    RecipeIngredientsTableComponent,
    RecipeWorkflowComponent,
    LucideAngularModule,
    TranslatePipe
  ],
  templateUrl: './recipe-builder.page.html',
  styleUrl: './recipe-builder.page.scss'
})
export class RecipeBuilderPage implements OnInit {
  private fb = inject(FormBuilder);
  private readonly state_ = inject(KitchenStateService);
  private readonly userMsg_ = inject(UserMsgService);
  private readonly route_ = inject(ActivatedRoute);
  private readonly router_ = inject(Router);
  private readonly unitRegistry_ = inject(UnitRegistryService);
  private readonly recipeCostService_ = inject(RecipeCostService);
  private readonly versionHistory_ = inject(VersionHistoryService);
  private readonly injector_ = inject(Injector);

  //SIGNALS
  protected isSaving_ = signal(false);
  private recipeId_ = signal<string | null>(null);
  protected resetTrigger_ = signal(0);
  isSubmitted = false;

  /** Bumped when ingredients change so cost/weight computeds re-run (form is not a signal). */
  private ingredientsFormVersion_ = signal(0);

  /** When set, the ingredients table will focus the search input at this row index; cleared after focus. */
  protected focusIngredientSearchAtRow_ = signal<number | null>(null);

  /** When set, the workflow will focus the textarea (prep) or prep search (dish) at this row index; cleared after focus. */
  protected focusWorkflowRowAt_ = signal<number | null>(null);

  /** True when viewing an old version from history (read-only, no save). */
  protected historyViewMode_ = signal(false);

  //COMPUTED
  protected totalCost_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue() as { ingredients?: { total_cost?: number }[] };
    const ingredients = raw?.ingredients || [];
    return ingredients.reduce((acc: number, ing: { total_cost?: number }) => acc + (ing.total_cost || 0), 0);
  });

  protected totalWeightG_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue() as { total_weight_g?: number };
    return raw?.total_weight_g ?? 0;
  });

  protected totalBrutoWeightG_ = signal(0);
  protected totalVolumeL_ = signal(0);
  protected totalVolumeMl_ = signal(0);
  protected unconvertibleForWeight_ = signal<string[]>([]);
  protected unconvertibleForVolume_ = signal<string[]>([]);

  protected recipeForm_ = this.fb.group(
    {
      name_hebrew: ['', Validators.required],
      recipe_type: ['preparation'],
      serving_portions: [1, [Validators.required, Validators.min(1)]],
      yield_conversions: this.fb.array([
        this.fb.group({ amount: [0], unit: ['gram'] })
      ]),
      ingredients: this.fb.array([]),
      workflow_items: this.fb.array([]),
      total_weight_g: [0],
      total_cost: [0]
    },
    { validators: this.recipeFormValidator_ }
  );

  protected portions_ = toSignal(
    this.recipeForm_.get('serving_portions')!.valueChanges.pipe(
      startWith(this.recipeForm_.get('serving_portions')?.value ?? 1)
    ),
    { initialValue: 1 }
  );

  protected recipeType_ = toSignal(
    this.recipeForm_.get('recipe_type')!.valueChanges.pipe(
      startWith(this.recipeForm_.get('recipe_type')?.value ?? 'preparation'),
      map((v: string | null) => (v === 'dish' ? 'dish' : 'preparation'))
    ),
    { initialValue: 'preparation' as const }
  );

  private destroyRef = inject(DestroyRef);

  private cachedPrepItems_: { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number; unit?: string }[] = [];
  private cachedSteps_: { order?: number; instruction?: string; labor_time?: number }[] = [];

  constructor() {
    this.ingredientsArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateTotalWeightG();
        this.ingredientsFormVersion_.update(v => v + 1);
      });

    this.recipeForm_.get('recipe_type')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.onRecipeTypeChange(type));
  }

  private onRecipeTypeChange(type: string | null): void {
    if (type == null) return;
    const isDish = type === 'dish';
    const wasDish = !isDish;

    if (wasDish) {
      const rows = this.workflowArray.controls.map(c => c.getRawValue() as { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number; unit?: string });
      this.cachedPrepItems_ = rows;
    } else {
      const rows = this.workflowArray.controls.map(c => c.getRawValue() as { order?: number; instruction?: string; labor_time?: number });
      this.cachedSteps_ = rows;
    }

    this.workflowArray.clear();
    if (isDish) {
      if (this.cachedPrepItems_.length > 0) {
        this.cachedPrepItems_.forEach(row => this.workflowArray.push(this.createPrepItemRow(row)));
      } else {
        this.workflowArray.push(this.createPrepItemRow());
      }
    } else {
      if (this.cachedSteps_.length > 0) {
        this.cachedSteps_.forEach((step, i) =>
          this.workflowArray.push(this.fb.group({
            order: [step.order ?? i + 1],
            instruction: [step.instruction ?? '', Validators.required],
            labor_time: [step.labor_time ?? 0]
          }))
        );
      } else {
        this.workflowArray.push(this.createStepGroup(1));
      }
    }
  }

  /** Resets the form to a blank state for creating a new recipe/dish. */
  private resetToNewForm_(): void {
    this.recipeId_.set(null);
    this.cachedPrepItems_ = [];
    this.cachedSteps_ = [];

    this.recipeForm_.patchValue(
      {
        name_hebrew: '',
        recipe_type: 'preparation',
        serving_portions: 1,
        total_weight_g: 0,
        total_cost: 0
      },
      { emitEvent: false }
    );

    this.yieldConversionsArray.clear();
    this.yieldConversionsArray.push(this.fb.group({ amount: [0], unit: ['gram'] }));

    this.ingredientsArray.clear();
    this.addNewIngredientRow();

    this.workflowArray.clear();
    this.workflowArray.push(this.createStepGroup(1));

    this.recipeForm_.updateValueAndValidity({ emitEvent: false });
    this.recipeForm_.markAsPristine();
    this.resetTrigger_.update(v => v + 1);
  }

  private updateTotalWeightG(): void {
    const raw = this.recipeForm_.getRawValue() as {
      ingredients?: { amount_net?: number; unit?: string; referenceId?: string; item_type?: string; name_hebrew?: string }[];
    };
    const rows = raw?.ingredients || [];
    const weight = this.recipeCostService_.computeTotalWeightG(rows);
    this.recipeForm_.get('total_weight_g')?.setValue(Math.round(weight), { emitEvent: false });
    this.totalBrutoWeightG_.set(Math.round(this.recipeCostService_.computeTotalBrutoWeightG(rows)));
    const vol = this.recipeCostService_.computeTotalVolumeL(rows);
    this.totalVolumeL_.set(vol.totalL);
    this.totalVolumeMl_.set(vol.totalL * 1000);
    this.unconvertibleForWeight_.set(this.recipeCostService_.getUnconvertibleNamesForWeight(rows));
    this.unconvertibleForVolume_.set(vol.unconvertibleNames);
  }

  async ngOnInit(): Promise<void> {
    const q = this.route_.snapshot.queryParams;
    const view = q['view'];
    const entityType = q['entityType'] as string | undefined;
    const entityId = q['entityId'];
    const versionAtStr = q['versionAt'];

    if (view === 'history' && entityType && entityId && versionAtStr) {
      const versionAt = Number(versionAtStr);
      if (!Number.isNaN(versionAt) && (entityType === 'recipe' || entityType === 'dish')) {
        const entry = await this.versionHistory_.getVersionEntry(
          entityType as VersionEntityType,
          entityId,
          versionAt
        );
        if (entry && (entry.entityType === 'recipe' || entry.entityType === 'dish')) {
          const snapshot = entry.snapshot as Recipe;
          this.patchFormFromRecipe(snapshot);
          this.historyViewMode_.set(true);
          this.recipeForm_.disable();
        } else {
          this.userMsg_.onSetErrorMsg('גרסה לא נמצאה');
        }
      }
    } else {
      const recipe = this.route_.snapshot.data['recipe'] as Recipe | null;
      if (recipe) {
        this.recipeId_.set(recipe._id);
        this.patchFormFromRecipe(recipe);
      } else {
        const type = this.route_.snapshot.queryParams['type'] as string | undefined;
        if (type === 'dish') {
          this.recipeForm_.patchValue({
            recipe_type: 'dish',
            serving_portions: 1,
          }, { emitEvent: false });
          this.yieldConversionsArray.clear();
          this.yieldConversionsArray.push(this.fb.group({ amount: [1], unit: ['dish'] }));
          this.workflowArray.clear();
          this.workflowArray.push(this.createPrepItemRow());
        }
      }
    }

    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow();
      runInInjectionContext(this.injector_, () => {
        afterNextRender(() => this.focusIngredientSearchAtRow_.set(0));
      });
    }
    if (this.workflowArray.length === 0) {
      const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish';
      if (isDish) {
        this.workflowArray.push(this.createPrepItemRow());
      } else {
        this.workflowArray.push(this.createStepGroup(1));
      }
    }
    this.updateTotalWeightG();
    this.recipeForm_.markAsPristine();
  }

  private patchFormFromRecipe(recipe: Recipe): void {
    const isDish = recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.mise_categories_?.length);
    this.recipeForm_.patchValue({
      name_hebrew: recipe.name_hebrew,
      recipe_type: isDish ? 'dish' : 'preparation',
      serving_portions: isDish ? recipe.yield_amount_ : 1,
      total_weight_g: 0,
      total_cost: 0
    });

    const yieldConv = this.yieldConversionsArray.at(0);
    if (yieldConv) {
      if (isDish) {
        yieldConv.patchValue({ amount: recipe.yield_amount_, unit: 'dish' });
      } else {
        yieldConv.patchValue({ amount: recipe.yield_amount_, unit: recipe.yield_unit_ });
      }
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
    if (isDish) {
      const prepRows = this.getPrepRowsFromRecipe(recipe);
      if (prepRows.length > 0) {
        prepRows.forEach(row => this.workflowArray.push(this.createPrepItemRow(row)));
      } else {
        this.workflowArray.push(this.createPrepItemRow());
      }
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
      instruction: [''],
      labor_time: [0]
    });
  }

  private createIngredientGroup(item: any = null) {
    const group = this.fb.group({
      referenceId: [item?._id || null],
      item_type: [item?.item_type_ || null], // product | recipe
      name_hebrew: [item?.name_hebrew || ''],
      amount_net: [item ? 1 : null, [Validators.min(0)]],
      yield_percentage: [item?.yield_percentage || 1],
      unit: [item?.base_unit_ || 'gram'],
      total_cost: [{ value: 0, disabled: true }]
    }, { validators: this.ingredientRowValidator });
    return group;
  }

  /** Require amount > 0 when referenceId is set; empty rows are valid. */
  private ingredientRowValidator(control: AbstractControl): ValidationErrors | null {
    const refId = control.get('referenceId')?.value;
    const amount = control.get('amount_net')?.value;
    if (!refId) return null;
    if (amount == null || amount === '') return { required: true };
    const numAmt = typeof amount === 'number' ? amount : Number(amount);
    if (isNaN(numAmt) || numAmt <= 0) return { min: true };
    return null;
  }

  /** Requires at least one ingredient with product/recipe selected and quantity > 0. */
  private recipeFormValidator_(control: AbstractControl): ValidationErrors | null {
    const ingredients = (control.get('ingredients')?.value || []) as { referenceId?: string; amount_net?: number | string }[];
    const hasValid = ingredients.some(ing => {
      if (!ing?.referenceId) return false;
      const amt = ing.amount_net;
      const num = typeof amt === 'number' ? amt : Number(amt);
      return amt != null && amt !== '' && !isNaN(num) && num > 0;
    });
    return hasValid ? null : { atLeastOneIngredient: true };
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

  private getPrepRowsFromRecipe(recipe: Recipe): { preparation_name: string; category_name: string; main_category_name: string; quantity: number; unit: string }[] {
    if (recipe.prep_items_?.length) {
      return recipe.prep_items_.map(p => ({
        preparation_name: p.preparation_name,
        category_name: p.category_name,
        main_category_name: p.category_name,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? 'unit'
      }));
    }
    if (recipe.mise_categories_?.length) {
      const rows: { preparation_name: string; category_name: string; main_category_name: string; quantity: number; unit: string }[] = [];
      recipe.mise_categories_.forEach(cat => {
        cat.items.forEach(it => {
          rows.push({
            preparation_name: it.item_name,
            category_name: cat.category_name,
            main_category_name: cat.category_name,
            quantity: it.quantity ?? 1,
            unit: it.unit ?? 'unit'
          });
        });
      });
      return rows;
    }
    return [];
  }

  private createPrepItemRow(row?: { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number; unit?: string }) {
    const units = this.unitRegistry_.allUnitKeys_();
    const defaultUnit = units[0] ?? 'unit';
    return this.fb.group({
      preparation_name: [row?.preparation_name ?? ''],
      category_name: [row?.category_name ?? ''],
      main_category_name: [row?.main_category_name ?? ''],
      quantity: [row?.quantity ?? 1, [Validators.min(0)]],
      unit: [row?.unit ?? defaultUnit, Validators.required]
    });
  }

  addNewStep(): void {
    const nextOrder = this.workflowArray.length + 1;
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish';

    // Logic: Add a prep row if it's a Dish, or a Step if it's a Prep
    const newGroup = isDish
      ? this.createPrepItemRow()
      : this.createStepGroup(nextOrder);

    this.workflowArray.push(newGroup);
    this.focusWorkflowRowAt_.set(this.workflowArray.length - 1);
  }

  //UPDATE

  addNewIngredientRow(): void {
    const newGroup = this.createIngredientGroup();
    this.ingredientsArray.push(newGroup);
    this.ingredientsArray.updateValueAndValidity();
    this.recipeForm_.get('ingredients')?.markAsDirty();
    this.focusIngredientSearchAtRow_.set(this.ingredientsArray.length - 1);
  }

  protected onIngredientSearchFocusDone(): void {
    this.focusIngredientSearchAtRow_.set(null);
  }

  saveRecipe(): void {
    if (this.recipeForm_.invalid) {
      this.recipeForm_.markAllAsTouched();
      const msg = this.getRecipeValidationError_();
      this.userMsg_.onSetErrorMsg(msg);
      return;
    }

    this.isSaving_.set(true);
    const recipe = this.buildRecipeFromForm();

    this.state_.saveRecipe(recipe).subscribe({
      next: () => {
        this.isSaving_.set(false);
        this.isSubmitted = true;
        this.resetToNewForm_();
        this.router_.navigate(['/recipe-builder']);
      },
      error: () => {
        this.isSaving_.set(false);
      }
    });
  }

  navigateBackFromHistory(): void {
    this.router_.navigate(['/recipe-book']);
  }

  /** Returns a user-friendly validation error message listing exactly what is missing. */
  private getRecipeValidationError_(): string {
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish';
    const errors: string[] = [];

    const name = (this.recipeForm_.get('name_hebrew')?.value ?? '').toString().trim();
    if (!name) {
      errors.push(isDish ? 'שם המנה חסר' : 'שם המתכון חסר');
    }

    const raw = this.recipeForm_.getRawValue() as {
      ingredients?: { referenceId?: string; amount_net?: number | string; name_hebrew?: string }[];
      workflow_items?: { preparation_name?: string; quantity?: number | string; unit?: string }[];
    };
    const ingredients = raw?.ingredients || [];
    const hasAnyIngredient = ingredients.some((ing: { referenceId?: string }) => !!ing?.referenceId);
    if (!hasAnyIngredient) {
      errors.push('חסר מרכיב: יש לבחור לפחות מוצר או מתכון אחד');
    }
    ingredients.forEach((ing: { referenceId?: string; amount_net?: number | string; name_hebrew?: string }, i: number) => {
      if (!ing?.referenceId) return;
      const amt = ing.amount_net;
      const numAmt = typeof amt === 'number' ? amt : Number(amt);
      const label = ing.name_hebrew || `מרכיב ${i + 1}`;
      if (amt == null || amt === '' || isNaN(numAmt) || numAmt < 0) {
        errors.push(`כמות חסרה עבור "${label}"`);
      } else if (numAmt === 0) {
        errors.push(`כמות עבור "${label}" חייבת להיות גדולה מ-0`);
      }
    });

    const portions = this.recipeForm_.get('serving_portions')?.value;
    if (isDish && (portions == null || Number(portions) < 1)) {
      errors.push('מספר מנות חסר או לא תקין (נדרש לפחות 1)');
    }

    const workflowRows = raw?.workflow_items || [];
    if (isDish) {
      workflowRows.forEach((row: { preparation_name?: string; quantity?: number | string; unit?: string }, i: number) => {
        if (!row?.preparation_name?.trim()) return;
        const qty = typeof row.quantity === 'number' ? row.quantity : Number(row.quantity);
        if (row.quantity == null || row.quantity === '' || isNaN(qty) || qty < 0) {
          errors.push(`כמות חסרה עבור ההכנה "${row.preparation_name}"`);
        }
        if (!row?.unit?.trim()) {
          errors.push(`יחידה חסרה עבור ההכנה "${row.preparation_name}"`);
        }
      });
    }

    if (errors.length === 0) {
      return 'יש למלא את כל השדות הנדרשים';
    }
    return errors.length === 1 ? errors[0] : `חסרים: ${errors.join('; ')}`;
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
    let prepItems: FlatPrepItem[] | undefined;
    let prepCategories: PrepCategory[] | undefined;

    if (isDish) {
      type PrepRow = { preparation_name?: string; category_name?: string; quantity?: number | string; unit?: string };
      const rows = (raw['workflow_items'] || []) as PrepRow[];
      prepItems = rows
        .filter(r => !!r?.preparation_name?.trim())
        .map(r => {
          const qty = typeof r.quantity === 'number' ? r.quantity : (Number(r.quantity) || 1);
          return {
            preparation_name: r.preparation_name ?? '',
            category_name: r.category_name ?? '',
            quantity: qty,
            unit: r.unit ?? 'unit'
          };
        });

      const byCategory = new Map<string, { item_name: string; unit: string; quantity?: number }[]>();
      prepItems.forEach(p => {
        const list = byCategory.get(p.category_name) ?? [];
        list.push({ item_name: p.preparation_name, unit: p.unit, quantity: p.quantity });
        byCategory.set(p.category_name, list);
      });
      prepCategories = Array.from(byCategory.entries()).map(([category_name, items]) => ({
        category_name,
        items: items.map(it => ({ item_name: it.item_name, unit: it.unit }))
      }));
    } else {
      type StepRow = { order?: number; instruction?: string; labor_time?: number };
      const stepRows = (raw['workflow_items'] || []) as StepRow[];
      stepRows
        .filter(s => !!s?.instruction?.trim())
        .forEach((step, i) => {
          steps.push({
            order_: step?.order ?? i + 1,
            instruction_: step?.instruction ?? '',
            labor_time_minutes_: step?.labor_time ?? 0
          });
        });
    }

    const yieldConv = (raw['yield_conversions'] as { amount?: number; unit?: string }[])?.[0];
    const yieldAmount = isDish ? ((raw['serving_portions'] as number) ?? 1) : (yieldConv?.amount ?? 0);
    const yieldUnit = isDish ? 'מנה' : (yieldConv?.unit ?? 'gram');

    return {
      _id: (this.recipeId_() ?? '') as string,
      name_hebrew: (raw['name_hebrew'] as string)?.trim() ?? '',
      ingredients_: ingredients,
      steps_: steps,
      yield_amount_: yieldAmount,
      yield_unit_: yieldUnit,
      default_station_: '',
      is_approved_: true,
      recipe_type_: isDish ? 'dish' : 'preparation',
      ...(prepItems && prepItems.length > 0 && { prep_items_: prepItems }),
      ...(prepCategories && prepCategories.length > 0 && { prep_categories_: prepCategories }),
      ...(prepCategories && prepCategories.length > 0 && { mise_categories_: prepCategories })
    };
  }

  //DELETE

  removeIngredient(index: number): void {
    this.ingredientsArray.removeAt(index);
    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow();
    }
  }

  protected onOpenUnitCreator(): void {
    this.unitRegistry_.openUnitCreator();
  }

  deleteStep(index: number): void {
    this.workflowArray.removeAt(index);

    if (this.recipeForm_.get('recipe_type')?.value === 'preparation') {
      this.workflowArray.controls.forEach((group, i) => {
        group.get('order')?.setValue(i + 1);
      });
    }
  }

  sortPrepByCategory(): void {
    if (this.recipeForm_.get('recipe_type')?.value !== 'dish') return;
    const controls = this.workflowArray.controls as FormGroup[];
    const sorted = [...controls].sort((a, b) => {
      const catA = (a.get('category_name')?.value ?? '') as string;
      const catB = (b.get('category_name')?.value ?? '') as string;
      return catA.localeCompare(catB);
    });
    this.workflowArray.clear();
    sorted.forEach(c => this.workflowArray.push(c));
  }
}