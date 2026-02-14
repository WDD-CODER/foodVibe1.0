import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { IngredientSearchComponent } from '../ingredient-search/ingredient-search.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { SelectOnFocusDirective } from "@directives/select-on-focus.directive";

@Component({
  selector: 'app-recipe-ingredients-table',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    IngredientSearchComponent,
    TranslatePipe,
    SelectOnFocusDirective,
    SelectOnFocusDirective
  ],
  templateUrl: './recipe-ingredients-table.component.html',
  styleUrl: './recipe-ingredients-table.component.scss'
})
export class RecipeIngredientsTableComponent {
  //INJECTIONS
  private readonly kitchenStateService = inject(KitchenStateService);
  private fb = inject(FormBuilder);

  //INPUT OUTPUT
  ingredientsFormArray = input.required<FormArray>();
  portions = input<number>(1);
  removeIngredient = output<number>(); // Emit index for removal
  addIngredient = output<any>();

  //COMPUTED
  protected totalMass_ = computed(() => {
    return this.ingredientGroups.reduce((acc, group) => {
      const net = group.get('amount_net')?.value || 0;
      return acc + (net * (this.portions() || 1));
    }, 0);
  });



  // GETTERS

  get ingredientGroups() {
    return [...this.ingredientsFormArray().controls] as FormGroup[];
  }



  onItemSelected(item: any, group: FormGroup) {
    group.patchValue({
      name_hebrew: item.name_hebrew,
      referenceId: item._id,
      item_type: item.item_type_,
      unit: item.base_unit_ || '',
      amount_net: 0,
    });

    // Trigger calculation for this specific row immediately
    const index = this.ingredientGroups.indexOf(group);
    if (index !== -1) {
      this.updateLineCalculations(index);
    }
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
    const item = this.getItemMetadata(group) as any; // Cast for metadata access
    if (!item) return;

    const netAmount = group.get('amount_net')?.value || 0;
    const selectedUnit = group.get('unit')?.value;
    let lineCost = 0;

    // 1. Check for specific Purchase Option overrides (e.g., specific price for 'ml')
    const unitOption = item.purchase_options_?.find((opt: any) => opt.unit_symbol_ === selectedUnit);

    if (unitOption) {
      // If we have a direct price override for this unit
      if (unitOption.price_override_) {
        lineCost = netAmount * unitOption.price_override_;
      } else {
        // Use conversion rate: (Amount / Rate) * Base Price
        const normalizedAmount = netAmount / (unitOption.conversion_rate_ || 1);
        const price = item.buy_price_global_ || 0;
        const yieldFactor = item.yield_factor_ || 1;
        lineCost = (normalizedAmount / yieldFactor) * price;
      }
    } else {
      // 2. Standard Calculation (Base Unit)
      const price = item.buy_price_global_ || item.calculated_cost_per_unit || 0;
      const yieldFactor = item.yield_factor_ || 1;
      lineCost = (netAmount / yieldFactor) * price;
    }

    group.get('total_cost')?.setValue(lineCost);

    // Trigger recursive update in the parent form
    this.ingredientsFormArray().parent?.updateValueAndValidity();
  }
  getAvailableUnits(group: FormGroup): string[] {
    const item = this.getItemMetadata(group) as any;
    if (!item) return [];

    const units = new Set<string>();

    // Add the primary base unit (e.g., "liter") [cite: 16]
    if (item.base_unit_) {
      units.add(item.base_unit_);
    }

    // Add units from purchase options (e.g., "ml") [cite: 7]
    if (item.purchase_options_ && Array.isArray(item.purchase_options_)) {
      item.purchase_options_.forEach((opt: any) => {
        if (opt.unit_symbol_) {
          units.add(opt.unit_symbol_);
        }
      });
    }

    // Add units from recipe unit options [cite: 17]
    if (item.unit_options_ && Array.isArray(item.unit_options_)) {
      item.unit_options_.forEach((opt: any) => {
        if (opt.unit_symbol_) {
          units.add(opt.unit_symbol_);
        }
      });
    }

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