import { Component, input, output, inject, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import type { IngredientWeightRow } from '@services/recipe-cost.service';
import { IngredientSearchComponent, type SearchableItem } from '../ingredient-search/ingredient-search.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { FocusByRowDirective } from '@directives/focus-by-row.directive';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';
import type { Product } from '@models/product.model';
import type { Recipe } from '@models/recipe.model';
import { UnitRegistryService } from '@services/unit-registry.service';
import { quantityIncrement, quantityDecrement } from 'src/app/core/utils/quantity-step.util';
import { take } from 'rxjs/operators';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragHandle } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-recipe-ingredients-table',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    IngredientSearchComponent,
    TranslatePipe,
    SelectOnFocusDirective,
    FocusByRowDirective,
    CustomSelectComponent,
    CdkDrag,
    CdkDropList,
    CdkDragHandle
  ],
  templateUrl: './recipe-ingredients-table.component.html',
  styleUrl: './recipe-ingredients-table.component.scss'
})
export class RecipeIngredientsTableComponent implements AfterViewInit {
  //INJECTIONS
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly unitRegistry = inject(UnitRegistryService);
  private fb = inject(FormBuilder);
  private readonly el = inject(ElementRef<HTMLElement>);

  @ViewChildren(FocusByRowDirective) private focusByRowRefs!: QueryList<FocusByRowDirective>;

  //INPUT OUTPUT
  ingredientsFormArray = input.required<FormArray>();
  portions = input<number>(1);
  focusSearchAtRow = input<number | null>(null);
  removeIngredient = output<number>();
  addIngredient = output<void>();
  focusSearchDone = output<void>();

  // GETTERS

  onDropIngredient(event: CdkDragDrop<FormGroup[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const formArray = this.ingredientsFormArray();
    const item = formArray.at(event.previousIndex);
    formArray.removeAt(event.previousIndex);
    formArray.insert(event.currentIndex, item);
    formArray.markAsDirty();
  }

  get ingredientGroups() {
    return [...this.ingredientsFormArray().controls] as FormGroup[];
  }

  /** Names of ingredients already selected in the recipe (for excluding from search dropdown). */
  get existingIngredientNames(): string[] {
    return this.ingredientGroups
      .filter(g => g.get('referenceId')?.value)
      .map(g => (g.get('name_hebrew')?.value ?? '').toString().trim())
      .filter(Boolean);
  }



  incrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net');
    const current = ctrl?.value ?? 0;
    ctrl?.setValue(quantityIncrement(current, 0));
    this.ingredientsFormArray().markAsDirty();
    this.updateLineCalculations(index);
  }

  decrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net');
    const current = ctrl?.value ?? 0;
    ctrl?.setValue(quantityDecrement(current, 0));
    this.ingredientsFormArray().markAsDirty();
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

  onItemSelected(item: SearchableItem, group: FormGroup) {
    const unit = 'base_unit_' in item ? (item.base_unit_ ?? '') : ('yield_unit_' in item ? (item.yield_unit_ ?? '') : '');
    group.patchValue({
      name_hebrew: item.name_hebrew,
      referenceId: item._id,
      item_type: item.item_type_,
      unit,
      amount_net: 0,
    });
    this.ingredientsFormArray().markAsDirty();

    const index = this.ingredientGroups.indexOf(group);
    if (index !== -1) {
      this.updateLineCalculations(index);
    }

    // Focus quantity so user can type immediately (no new row yet; Enter in qty/unit adds row).
    setTimeout(() => this.focusQuantityAtRow(index), 0);
  }

  focusQuantityAtRow(rowIndex: number): void {
    const refs = this.focusByRowRefs?.toArray() ?? [];
    const ref = refs.find((r) => r.rowIndex() === rowIndex && r.kind() === 'qty');
    ref?.focus();
  }

  focusUnitAtRow(rowIndex: number): void {
    const refs = this.focusByRowRefs?.toArray() ?? [];
    const ref = refs.find((r) => r.rowIndex() === rowIndex && r.kind() === 'unit');
    ref?.focus();
  }

  onQuantityKeydown(e: KeyboardEvent, rowIndex: number): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addIngredient.emit();
    }
  }

  onUnitKeydown(e: KeyboardEvent, rowIndex: number): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addIngredient.emit();
    }
  }

  clearIngredient(group: FormGroup): void {
    group.patchValue({
      referenceId: null,
      name_hebrew: '',
      item_type: null,
      amount_net: null,
      unit: 'gram',
    });
    this.ingredientsFormArray().markAsDirty();
    group.updateValueAndValidity();
    this.ingredientsFormArray().updateValueAndValidity();
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
      const prod = item as { base_unit_?: string; purchase_options_?: { unit_symbol_: string; conversion_rate_?: number; price_override_?: number }[]; buy_price_global_?: number; yield_factor_?: number; calculated_cost_per_unit?: number };
      const unitOption = prod.purchase_options_?.find(o => o.unit_symbol_ === selectedUnit);

      if (unitOption) {
        if (unitOption.price_override_ != null) {
          const conv = unitOption.conversion_rate_ || 1;
          const pricePerUnit = unitOption.price_override_ / conv;
          lineCost = netAmount * pricePerUnit;
        } else {
          const normalizedAmount = netAmount / (unitOption.conversion_rate_ || 1);
          const price = prod.buy_price_global_ || 0;
          const yieldFactor = prod.yield_factor_ || 1;
          lineCost = (normalizedAmount / yieldFactor) * price;
        }
      } else {
        // Selected unit not in purchase_options_ (e.g. custom unit like כפית): convert to product base unit via registry.
        const price = prod.buy_price_global_ || prod.calculated_cost_per_unit || 0;
        const yieldFactor = prod.yield_factor_ || 1;
        const baseUnit = prod.base_unit_ || 'gram';
        const amountG = this.recipeCostService.convertToBaseUnits(netAmount, selectedUnit);
        const baseFactor = this.unitRegistry.getConversion(baseUnit) || 1;
        const amountInBaseUnit = amountG / baseFactor;
        lineCost = (amountInBaseUnit / yieldFactor) * price;
      }
    }

    group.get('total_cost')?.setValue(lineCost);
    this.ingredientsFormArray().markAsDirty();
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

  getUnitOptions(group: FormGroup): { value: string; label: string }[] {
    const available = this.getAvailableUnits(group);
    const currentUnit = group.get('unit')?.value;
    const unitsSet = new Set(available);
    if (currentUnit && typeof currentUnit === 'string' && currentUnit.trim() && !unitsSet.has(currentUnit.trim())) {
      unitsSet.add(currentUnit.trim());
    }
    const opts = Array.from(unitsSet).map((u) => ({ value: u, label: u }));
    return [...opts, { value: '__add_unit__', label: '+ יחידה חדשה' }];
  }

  onUnitChange(group: FormGroup, index: number, val: string): void {
    if (val === '__add_unit__') {
      group.get('unit')?.setValue('');
      this.ingredientsFormArray().markAsDirty();
      setTimeout(() => this.unitRegistry.openUnitCreator(), 0);
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe(newUnit => {
        const setUnitAndUpdate = (): void => {
          group.get('unit')?.setValue(newUnit);
          this.ingredientsFormArray().markAsDirty();
          this.updateLineCalculations(index);
        };
        if (group.get('item_type')?.value === 'product') {
          const product = this.getItemMetadata(group) as Product | undefined;
          if (product && product._id) {
            const existing = product.purchase_options_?.some(o => o.unit_symbol_ === newUnit);
            if (!existing) {
              const baseFactor = this.unitRegistry.getConversion(product.base_unit_) || 1;
              const unitFactor = this.unitRegistry.getConversion(newUnit) || 1;
              const conversion_rate_ = unitFactor > 0 ? baseFactor / unitFactor : 1;
              const newOption = {
                unit_symbol_: newUnit,
                conversion_rate_,
                uom: product.base_unit_,
                price_override_: 0
              };
              const updated: Product = {
                ...product,
                purchase_options_: [...(product.purchase_options_ ?? []), newOption]
              };
              this.kitchenStateService.saveProduct(updated).subscribe({
                next: () => setUnitAndUpdate(),
                error: () => setUnitAndUpdate()
              });
              return;
            }
          }
        }
        setUnitAndUpdate();
      });
    } else {
      group.get('unit')?.setValue(val);
      this.ingredientsFormArray().markAsDirty();
      this.updateLineCalculations(index);
    }
  }

  getGrossWeight(index: number): number {
    const group = this.ingredientGroups[index];
    const net = group.get('amount_net')?.value || 0;

    if (group.get('item_type')?.value !== 'product') {
      return net; // For preps, Net is effectively Gross
    }

    const item = this.getItemMetadata(group);
    const yieldValue = (item as Product)?.yield_factor_ ?? 1;
    return net / yieldValue;
  }

  // #region agent log
  ngAfterViewInit(): void {
    setTimeout(() => this.logIngredientsLayout(), 100);
  }

  private logIngredientsLayout(): void {
    const host = this.el.nativeElement;
    const container = host.querySelector('.ingredients-container') as HTMLElement | null;
    const firstRow = host.querySelector('.ingredient-grid-row') as HTMLElement | null;
    const firstQtyControls = host.querySelector('.quantity-controls') as HTMLElement | null;
    const firstQtyBtn = host.querySelector('.qty-btn') as HTMLElement | null;
    const getStyle = (el: HTMLElement | null, ...props: string[]) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return props.reduce((acc, p) => ({ ...acc, [p]: s.getPropertyValue(p.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')) }), {} as Record<string, string>);
    };
    const payload = {
      sessionId: '632f09',
      location: 'recipe-ingredients-table.component.ts:logIngredientsLayout',
      message: 'ingredients layout computed',
      data: {
        containerWidth: container?.offsetWidth ?? null,
        containerStyles: container ? { borderRadius: getComputedStyle(container).borderRadius, background: getComputedStyle(container).backgroundColor, border: getComputedStyle(container).border } : null,
        rowStyles: firstRow ? { minHeight: getComputedStyle(firstRow).minHeight, gridTemplateColumns: getComputedStyle(firstRow).gridTemplateColumns } : null,
        qtyControlsStyles: firstQtyControls ? { display: getComputedStyle(firstQtyControls).display, gap: getComputedStyle(firstQtyControls).gap, borderRadius: getComputedStyle(firstQtyControls).borderRadius, background: getComputedStyle(firstQtyControls).backgroundColor, border: getComputedStyle(firstQtyControls).border } : null,
        qtyBtnStyles: firstQtyBtn ? { width: getComputedStyle(firstQtyBtn).width, height: getComputedStyle(firstQtyBtn).height, borderRadius: getComputedStyle(firstQtyBtn).borderRadius } : null,
        hasRows: !!firstRow,
        hasQtyControls: !!firstQtyControls,
      },
      timestamp: Date.now(),
      hypothesisId: 'A,B,C,D,E',
    };
    fetch('http://127.0.0.1:7371/ingest/4b1f7a8a-853d-43fb-a4b0-16a30277ea08', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '632f09' }, body: JSON.stringify(payload) }).catch(() => {});
  }
  // #endregion
}