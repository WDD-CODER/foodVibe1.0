import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import type { IngredientWeightRow } from '@services/recipe-cost.service';
import { IngredientSearchComponent } from '../ingredient-search/ingredient-search.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';

@Component({
  selector: 'app-recipe-ingredients-table',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    IngredientSearchComponent,
    TranslatePipe,
    SelectOnFocusDirective
  ],
  templateUrl: './recipe-ingredients-table.component.html',
  styleUrl: './recipe-ingredients-table.component.scss'
})
export class RecipeIngredientsTableComponent {
  //INJECTIONS
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly recipeCostService = inject(RecipeCostService);
  private fb = inject(FormBuilder);

  //INPUT OUTPUT
  ingredientsFormArray = input.required<FormArray>();
  portions = input<number>(1);
  removeIngredient = output<number>();
  addIngredient = output<void>();

  // GETTERS

  get ingredientGroups() {
    return [...this.ingredientsFormArray().controls] as FormGroup[];
  }



  incrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net');
    const val = (ctrl?.value ?? 0) + 1;
    ctrl?.setValue(val);
    this.updateLineCalculations(index);
  }

  decrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net');
    const val = Math.max(0, (ctrl?.value ?? 0) - 1);
    ctrl?.setValue(val);
    this.updateLineCalculations(index);
  }

  getTotalWeightG(): number {
    const rows = this.ingredientGroups.map(g => ({
      amount_net: g.get('amount_net')?.value,
      unit: g.get('unit')?.value,
      referenceId: g.get('referenceId')?.value,
      item_type: g.get('item_type')?.value
    })) as IngredientWeightRow[];
    return this.recipeCostService.computeTotalWeightG(rows);
  }

  getPercentageDisplay(group: FormGroup): string {
    const row: IngredientWeightRow = {
      amount_net: group.get('amount_net')?.value,
      unit: group.get('unit')?.value,
      referenceId: group.get('referenceId')?.value,
      item_type: group.get('item_type')?.value
    };
    const rowG = this.recipeCostService.getRowWeightG(row);
    if (rowG === null) return 'n/a';
    const total = this.getTotalWeightG();
    if (total === 0) return '0%';
    return `${((rowG / total) * 100).toFixed(1)}%`;
  }

  onItemSelected(item: any, group: FormGroup) {
    group.patchValue({
      name_hebrew: item.name_hebrew,
      referenceId: item._id,
      item_type: item.item_type_,
      unit: item.base_unit_ || '',
      amount_net: 0,
    });

    const index = this.ingredientGroups.indexOf(group);
    if (index !== -1) {
      this.updateLineCalculations(index);
    }

    this.addIngredient.emit();
  }

  getItemMetadata(group: FormGroup) {
    const id = group.get('referenceId')?.value;
    const type = group.get('item_type')?.value;
    return type === 'product'
      ? this.kitchenStateService.products_().find(p => p._id === id)
      : this.kitchenStateService.recipes_().find(r => r._id === id);
  }

  updateLineCalculations(index: number): void {
    const group = this.ingredientGroups[index];
    const item = this.getItemMetadata(group);
    if (!item) return;

    const netAmount = group.get('amount_net')?.value || 0;
    const selectedUnit = group.get('unit')?.value || '';
    const itemType = group.get('item_type')?.value;

    let lineCost = 0;

    if (itemType === 'recipe') {
      const recipe = item as import('@models/recipe.model').Recipe;
      const costPerUnit = this.recipeCostService.getRecipeCostPerUnit(recipe);
      const yieldUnit = recipe.yield_unit_ || 'unit';
      const amountInYieldUnit = selectedUnit === yieldUnit
        ? netAmount
        : this.recipeCostService.convertToBaseUnits(netAmount, selectedUnit) /
          (this.recipeCostService.convertToBaseUnits(1, yieldUnit) || 1);
      lineCost = amountInYieldUnit * costPerUnit;
    } else {
      const prod = item as { purchase_options_?: { unit_symbol_: string; conversion_rate_?: number; price_override_?: number }[]; buy_price_global_?: number; yield_factor_?: number; calculated_cost_per_unit?: number };
      const unitOption = prod.purchase_options_?.find(o => o.unit_symbol_ === selectedUnit);

      if (unitOption) {
        if (unitOption.price_override_ != null) {
          lineCost = netAmount * unitOption.price_override_;
        } else {
          const normalizedAmount = netAmount / (unitOption.conversion_rate_ || 1);
          const price = prod.buy_price_global_ || 0;
          const yieldFactor = prod.yield_factor_ || 1;
          lineCost = (normalizedAmount / yieldFactor) * price;
        }
      } else {
        const price = prod.buy_price_global_ || prod.calculated_cost_per_unit || 0;
        const yieldFactor = prod.yield_factor_ || 1;
        lineCost = (netAmount / yieldFactor) * price;
      }
    }

    group.get('total_cost')?.setValue(lineCost);
    this.ingredientsFormArray().parent?.updateValueAndValidity();
  }
  getAvailableUnits(group: FormGroup): string[] {
    const item = this.getItemMetadata(group);
    if (!item) return [];

    const units = new Set<string>();
    const meta = item as { base_unit_?: string; purchase_options_?: { unit_symbol_?: string }[]; unit_options_?: { unit_symbol_?: string }[]; yield_unit_?: string };

    if (meta.base_unit_) units.add(meta.base_unit_);
    if (meta.purchase_options_?.length) {
      meta.purchase_options_.forEach(o => { if (o.unit_symbol_) units.add(o.unit_symbol_); });
    }
    if (meta.unit_options_?.length) {
      meta.unit_options_.forEach(o => { if (o.unit_symbol_) units.add(o.unit_symbol_); });
    }
    if (meta.yield_unit_) units.add(meta.yield_unit_);

    return Array.from(units);
  }

  getGrossWeight(index: number): number {
    const group = this.ingredientGroups[index];
    const net = group.get('amount_net')?.value || 0;

    if (group.get('item_type')?.value !== 'product') {
      return net; // For preps, Net is effectively Gross
    }

    const item = this.getItemMetadata(group);
    const yieldValue = (item as any)?.yield_percentage || 1;
    return net / yieldValue;
  }
}