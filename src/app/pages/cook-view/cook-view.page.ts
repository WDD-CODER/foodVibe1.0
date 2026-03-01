import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { Recipe, RecipeStep, FlatPrepItem, PrepCategory } from '@models/recipe.model';
import { ScalingService, ScaledIngredientRow, ScaledPrepRow } from '@services/scaling.service';
import { CookViewStateService } from '@services/cook-view-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { RecipeWorkflowComponent } from '@pages/recipe-builder/components/recipe-workflow/recipe-workflow.component';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';

@Component({
  selector: 'app-cook-view-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    SelectOnFocusDirective,
    RecipeWorkflowComponent,
    LoaderComponent,
    CustomSelectComponent
  ],
  templateUrl: './cook-view.page.html',
  styleUrl: './cook-view.page.scss'
})
export class CookViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly scalingService = inject(ScalingService);
  private readonly cookViewState = inject(CookViewStateService);
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly kitchenState = inject(KitchenStateService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly unitRegistry = inject(UnitRegistryService);

  protected recipe_ = signal<Recipe | null>(null);
  protected targetQuantity_ = signal<number>(1);
  /** Per-row unit override (index -> unit key). */
  protected unitOverrides_ = signal<Record<number, string>>({});
  protected editMode_ = signal<boolean>(false);
  /** Snapshot when entering edit mode; restored on Undo. */
  private originalRecipe_ = signal<Recipe | null>(null);
  protected isSaving_ = signal(false);
  /** Parent form for workflow_items FormArray; used in edit mode only. */
  private readonly workflowParentForm_ = this.fb.group({ workflow_items: this.fb.array([]) });
  /** Focus workflow row at index (for add step/prep); cleared after focus. */
  protected focusWorkflowRowAt_ = signal<number | null>(null);
  private workflowResetTrigger_ = 0;

  protected scaleFactor_ = computed(() => {
    const recipe = this.recipe_();
    const qty = this.targetQuantity_();
    if (!recipe) return 1;
    return this.scalingService.getScaleFactor(recipe, qty);
  });

  protected scaledIngredients_ = computed(() => {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe) return [];
    return this.scalingService.getScaledIngredients(recipe, factor);
  });

  protected scaledPrep_ = computed(() => {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe) return [];
    return this.scalingService.getScaledPrepItems(recipe, factor);
  });

  protected scaledCost_ = computed(() => {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe?.ingredients_?.length) return 0;
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: recipe.ingredients_.map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor
      }))
    };
    return this.recipeCostService.computeRecipeCost(scaledRecipe);
  });

  protected isDish_ = computed(() => {
    const r = this.recipe_();
    return !!(r?.recipe_type_ === 'dish' || (r?.prep_items_?.length ?? 0) > 0 || (r?.mise_categories_?.length ?? 0) > 0);
  });

  protected get workflowFormArray(): FormArray {
    return this.workflowParentForm_.get('workflow_items') as FormArray;
  }

  protected get workflowResetTrigger(): number {
    return this.workflowResetTrigger_;
  }

  ngOnInit(): void {
    const recipe = this.route.snapshot.data['recipe'] as Recipe | null;
    if (recipe) {
      this.recipe_.set(recipe);
      this.cookViewState.setLastViewedRecipeId(recipe._id);
      const base = recipe.yield_amount_ ?? 1;
      this.targetQuantity_.set(base);
    } else {
      const lastId = this.cookViewState.lastRecipeId();
      if (lastId) {
        this.router.navigate(['/cook', lastId]);
        return;
      }
    }
  }

  protected setQuantity(value: number): void {
    const num = value != null && !Number.isNaN(value) ? Number(value) : (this.recipe_()?.yield_amount_ ?? 1);
    const recipe = this.recipe_();
    const min = recipe?.yield_unit_ === 'dish' ? 1 : 0.01;
    this.targetQuantity_.set(Math.max(min, num));
  }

  protected incrementQuantity(): void {
    const recipe = this.recipe_();
    const step = recipe?.yield_unit_ === 'dish' ? 1 : 1;
    this.targetQuantity_.update(q => q + step);
  }

  protected decrementQuantity(): void {
    const recipe = this.recipe_();
    const min = recipe?.yield_unit_ === 'dish' ? 1 : 0.01;
    const step = recipe?.yield_unit_ === 'dish' ? 1 : 1;
    this.targetQuantity_.update(q => Math.max(min, q - step));
  }

  protected enterEditMode(): void {
    const recipe = this.recipe_();
    if (!recipe) return;
    this.originalRecipe_.set(JSON.parse(JSON.stringify(recipe)));
    this.editMode_.set(true);
    this.unitOverrides_.set({});
    this.buildWorkflowFormFromRecipe(recipe);
  }

  protected saveEdits(): void {
    this.applyWorkflowFormToRecipe();
    this.confirmModal.open('save_changes', { saveLabel: 'save_changes' }).then(confirmed => {
      if (!confirmed) return;
      const recipe = this.recipe_();
      if (!recipe) return;
      this.isSaving_.set(true);
      this.kitchenState.saveRecipe(recipe).subscribe({
        next: () => {
          this.originalRecipe_.set(null);
          this.editMode_.set(false);
          this.isSaving_.set(false);
        },
        error: () => { this.isSaving_.set(false); }
      });
    });
  }

  protected undoEdits(): void {
    const orig = this.originalRecipe_();
    if (orig) {
      this.recipe_.set(orig);
      this.originalRecipe_.set(null);
      this.editMode_.set(false);
      this.unitOverrides_.set({});
    }
  }

  /** For route guard: true when in edit mode with unsaved changes. */
  hasUnsavedEdits(): boolean {
    const edit = this.editMode_();
    const orig = this.originalRecipe_();
    const current = this.recipe_();
    if (!edit || !orig || !current) return false;
    return JSON.stringify(current) !== JSON.stringify(orig);
  }

  protected getEditAmountStep(currentAmount: number, delta: number): number {
    const step = this.isDish_() ? 1 : 0.1;
    const next = currentAmount + step * delta;
    return Math.max(0, next);
  }

  protected setIngredientAmount(index: number, scaledAmount: number): void {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe?.ingredients_?.length || factor <= 0) return;
    const base = Math.max(0, scaledAmount) / factor;
    this.recipe_.update(r => {
      if (!r) return r;
      return {
        ...r,
        ingredients_: r.ingredients_.map((ing, i) =>
          i === index ? { ...ing, amount_: base } : ing
        )
      };
    });
  }

  protected setIngredientUnit(index: number, unit: string): void {
    this.recipe_.update(r => {
      if (!r) return r;
      return {
        ...r,
        ingredients_: r.ingredients_.map((ing, i) =>
          i === index ? { ...ing, unit_: unit } : ing
        )
      };
    });
  }

  protected replaceIngredient(index: number, item: { _id: string; item_type_?: string; name_hebrew?: string; base_unit_?: string; yield_unit_?: string }): void {
    const recipe = this.recipe_();
    if (!recipe?.ingredients_?.[index]) return;
    const type = item.item_type_ === 'recipe' ? 'recipe' as const : 'product' as const;
    const unit = item.base_unit_ ?? (item as { yield_unit_?: string }).yield_unit_ ?? 'unit';
    const current = recipe.ingredients_[index];
    this.recipe_.update(r => {
      if (!r) return r;
      return {
        ...r,
        ingredients_: r.ingredients_.map((ing, i) =>
          i === index
            ? { ...current, referenceId: item._id, type, unit_: unit }
            : ing
        )
      };
    });
  }

  protected removeIngredient(index: number): void {
    this.recipe_.update(r => {
      if (!r) return r;
      return {
        ...r,
        ingredients_: r.ingredients_.filter((_, i) => i !== index)
      };
    });
  }

  protected ingredientChanged(index: number): boolean {
    const orig = this.originalRecipe_();
    const current = this.recipe_();
    if (!orig?.ingredients_?.length || !current?.ingredients_?.[index]) return false;
    const o = orig.ingredients_[index];
    const c = current.ingredients_[index];
    return o.amount_ !== c.amount_ || o.unit_ !== c.unit_ || o.referenceId !== c.referenceId;
  }

  protected onEdit(): void {
    const recipe = this.recipe_();
    if (recipe) this.router.navigate(['/recipe-builder', recipe._id]);
  }

  protected setUnitOverride(rowIndex: number, unit: string): void {
    this.unitOverrides_.update(m => ({ ...m, [rowIndex]: unit }));
  }

  protected getDisplayUnit(rowIndex: number, row: ScaledIngredientRow): string {
    const overrides = this.unitOverrides_();
    return overrides[rowIndex] ?? row.unit;
  }

  protected getUnitOptionsForRow(row: ScaledIngredientRow): { value: string; label: string }[] {
    return (row.availableUnits || []).map((u) => ({ value: u, label: u }));
  }

  protected getDisplayAmount(rowIndex: number, row: ScaledIngredientRow): number {
    const overrides = this.unitOverrides_();
    const targetUnit = overrides[rowIndex];
    if (!targetUnit || targetUnit === row.unit) return row.amount;
    const baseFrom = this.recipeCostService.convertToBaseUnits(row.amount, row.unit);
    const basePerOne = this.recipeCostService.convertToBaseUnits(1, targetUnit);
    if (!basePerOne) return row.amount;
    return baseFrom / basePerOne;
  }

  protected formatAmount(amount: number): string {
    if (Number.isInteger(amount)) return String(amount);
    return amount.toFixed(2).replace(/\.?0+$/, '');
  }

  protected addWorkflowItem(): void {
    const arr = this.workflowFormArray;
    const isDish = this.isDish_();
    if (isDish) {
      arr.push(this.createPrepItemRow());
    } else {
      arr.push(this.createStepGroup(arr.length + 1));
    }
    this.focusWorkflowRowAt_.set(arr.length - 1);
  }

  protected removeWorkflowItem(index: number): void {
    const arr = this.workflowFormArray;
    arr.removeAt(index);
    if (!this.isDish_()) {
      arr.controls.forEach((group, i) => group.get('order')?.setValue(i + 1));
    }
  }

  protected sortPrepByCategory(): void {
    if (!this.isDish_()) return;
    const arr = this.workflowFormArray;
    const controls = arr.controls as FormGroup[];
    const sorted = [...controls].sort((a, b) => {
      const catA = (a.get('category_name')?.value ?? '') as string;
      const catB = (b.get('category_name')?.value ?? '') as string;
      return catA.localeCompare(catB);
    });
    arr.clear();
    sorted.forEach(c => arr.push(c));
  }

  protected onWorkflowFocusRowDone(): void {
    this.focusWorkflowRowAt_.set(null);
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

  private createStepGroup(order: number): FormGroup {
    return this.fb.group({
      order: [order],
      instruction: [''],
      labor_time: [0]
    });
  }

  private createPrepItemRow(row?: { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number; unit?: string }): FormGroup {
    const units = this.unitRegistry.allUnitKeys_();
    const defaultUnit = units[0] ?? 'unit';
    return this.fb.group({
      preparation_name: [row?.preparation_name ?? ''],
      category_name: [row?.category_name ?? ''],
      main_category_name: [row?.main_category_name ?? ''],
      quantity: [row?.quantity ?? 1, [Validators.min(0)]],
      unit: [row?.unit ?? defaultUnit, Validators.required]
    });
  }

  private buildWorkflowFormFromRecipe(recipe: Recipe): void {
    const arr = this.workflowFormArray;
    arr.clear();
    const isDish = this.isDish_();
    if (isDish) {
      const prepRows = this.getPrepRowsFromRecipe(recipe);
      if (prepRows.length > 0) {
        prepRows.forEach(row => arr.push(this.createPrepItemRow(row)));
      } else {
        arr.push(this.createPrepItemRow());
      }
    } else {
      const steps = recipe.steps_ ?? [];
      if (steps.length > 0) {
        steps.forEach((step, i) =>
          arr.push(this.fb.group({
            order: [step.order_ ?? i + 1],
            instruction: [step.instruction_ ?? '', Validators.required],
            labor_time: [step.labor_time_minutes_ ?? 0]
          }))
        );
      } else {
        arr.push(this.createStepGroup(1));
      }
    }
    this.workflowResetTrigger_ += 1;
  }

  private applyWorkflowFormToRecipe(): void {
    const recipe = this.recipe_();
    if (!recipe || !this.editMode_()) return;
    const raw = this.workflowFormArray.getRawValue() as Record<string, unknown>[];
    const isDish = this.isDish_();
    if (isDish) {
      const prepItems: FlatPrepItem[] = (raw || [])
        .filter((r: { preparation_name?: string }) => !!r?.preparation_name?.trim())
        .map((r: { preparation_name?: string; category_name?: string; quantity?: number | string; unit?: string }) => {
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
      const prepCategories: PrepCategory[] = Array.from(byCategory.entries()).map(([category_name, items]) => ({
        category_name,
        items: items.map(it => ({ item_name: it.item_name, unit: it.unit }))
      }));
      this.recipe_.update(r => ({
        ...r,
        prep_items_: prepItems,
        prep_categories_: prepCategories,
        mise_categories_: prepCategories
      } as Recipe));
    } else {
      const steps: RecipeStep[] = (raw || [])
        .filter((s: { instruction?: string }) => !!s?.instruction?.trim())
        .map((step: { order?: number; instruction?: string; labor_time?: number }, i: number) => ({
          order_: step?.order ?? i + 1,
          instruction_: step?.instruction ?? '',
          labor_time_minutes_: step?.labor_time ?? 0
        }));
      this.recipe_.update(r => ({ ...r, steps_: steps.length ? steps : [] } as Recipe));
    }
  }
}
