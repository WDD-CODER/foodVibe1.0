import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { Recipe } from '@models/recipe.model';
import { ScalingService, ScaledIngredientRow, ScaledPrepRow } from '@services/scaling.service';
import { CookViewStateService } from '@services/cook-view-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';

@Component({
  selector: 'app-cook-view-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    SelectOnFocusDirective
  ],
  templateUrl: './cook-view.page.html',
  styleUrl: './cook-view.page.scss'
})
export class CookViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scalingService = inject(ScalingService);
  private readonly cookViewState = inject(CookViewStateService);
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly kitchenState = inject(KitchenStateService);
  private readonly confirmModal = inject(ConfirmModalService);

  protected recipe_ = signal<Recipe | null>(null);
  protected targetQuantity_ = signal<number>(1);
  /** Per-row unit override (index -> unit key). */
  protected unitOverrides_ = signal<Record<number, string>>({});
  protected editMode_ = signal<boolean>(false);
  /** Snapshot when entering edit mode; restored on Undo. */
  private originalRecipe_ = signal<Recipe | null>(null);

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
  }

  protected saveEdits(): void {
    this.confirmModal.open('save_changes', { saveLabel: 'save_changes' }).then(confirmed => {
      if (!confirmed) return;
      const recipe = this.recipe_();
      if (!recipe) return;
      this.kitchenState.saveRecipe(recipe).subscribe({
        next: () => {
          this.originalRecipe_.set(null);
          this.editMode_.set(false);
        },
        error: () => {}
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
}
