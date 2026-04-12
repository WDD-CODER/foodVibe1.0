import { Component, input, output, inject, signal, ViewChildren, ViewChild, QueryList, effect, ChangeDetectorRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router'
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BreakpointObserver } from '@angular/cdk/layout';
import { KitchenStateService } from '@services/kitchen-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import type { IngredientWeightRow } from '@services/recipe-cost.service';
import { IngredientSearchComponent, type SearchableItem } from '../ingredient-search/ingredient-search.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { FocusByRowDirective } from '@directives/focus-by-row.directive';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';
import { QuickEditProductPanelComponent } from 'src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component';
import { QuickEditProductModalService } from '@services/quick-edit-product-modal.service';
import type { Product } from '@models/product.model'
import { getProductValidationStatus } from 'src/app/core/utils/product-validation.util';
import type { Recipe } from '@models/recipe.model';
import { UnitRegistryService } from '@services/unit-registry.service';
import { quantityIncrement, quantityDecrement, QuantityStepOptions } from 'src/app/core/utils/quantity-step.util';
import { map } from 'rxjs';
import { take } from 'rxjs/operators';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ClickOutSideDirective } from '@directives/click-out-side';

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
    QuickEditProductPanelComponent,
    CdkDrag,
    CdkDropList,
    CdkDragHandle,
    ClickOutSideDirective
  ],
  templateUrl: './recipe-ingredients-table.component.html',
  styleUrl: './recipe-ingredients-table.component.scss'
})
export class RecipeIngredientsTableComponent {
  //INJECTIONS
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly unitRegistry = inject(UnitRegistryService);
  private readonly quickEditModalService = inject(QuickEditProductModalService);
  private readonly bp = inject(BreakpointObserver);
  private fb = inject(FormBuilder);
private readonly cdr = inject(ChangeDetectorRef)
  private readonly router_ = inject(Router)

  protected readonly isMobile_ = toSignal(
    this.bp.observe('(max-width: 767px)').pipe(map(r => r.matches)),
    { initialValue: false }
  );

  @ViewChildren(FocusByRowDirective) private focusByRowRefs!: QueryList<FocusByRowDirective>;
  @ViewChild(QuickEditProductPanelComponent) private quickEditPanelRef_?: QuickEditProductPanelComponent;

  constructor() {
    effect(() => {
      this.kitchenStateService.products_();
      this.kitchenStateService.recipes_();
      this.refreshAllLineCalculations();
    });
  }

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

  /** When set, this row index shows ingredient-search instead of selected-item-display (click name to change item). */
  protected editingNameAtRow_ = signal<number | null>(null);

  /** Index of the row currently showing the inline quick-edit accordion (desktop only). */
  protected quickEditRowIndex_ = signal<number | null>(null);

  /** Index of the row currently animating closed (kept in DOM during 200ms collapse). */
  protected quickEditRowClosingIndex_ = signal<number | null>(null);

  /** Validation tier of the currently-open quick-edit row — drives field focus inside the panel. */
  protected quickEditRowTier_ = signal<'invalid' | 'incomplete' | null>(null);

  /** Resolve the product for a form group by referenceId. Returns null for unlinked rows. */
  protected getProductForGroup(group: FormGroup): Product | null {
    const refId = group.get('referenceId')?.value as string | null;
    if (!refId) return null;
    return this.kitchenStateService.products_().find(p => p._id === refId) ?? null;
  }

  /** Route the badge click: desktop → inline accordion; mobile → service-driven modal. */
  protected onQuickEditBadgeClick(group: FormGroup, index: number, tier: 'invalid' | 'incomplete'): void {
    const product = this.getProductForGroup(group);
    if (!product) return;
    if (this.isMobile_()) {
      void this.quickEditModalService.open({ product, tier });
    } else {
      const alreadyOpen = this.quickEditRowIndex_() === index;
      if (alreadyOpen) {
        this.closeQuickEditWithAnimation();
      } else {
        this.quickEditRowIndex_.set(index);
        this.quickEditRowTier_.set(tier);
      }
    }
  }

  /** Called by clickOutside on the accordion div — defers to panel if it has unsaved changes. */
  protected onAccordionClickOutside(): void {
    if (this.quickEditPanelRef_) {
      this.quickEditPanelRef_.requestClose();
    } else {
      this.closeQuickEditWithAnimation();
    }
  }

  /** Close the accordion with the collapse animation (200ms). */
  protected closeQuickEditWithAnimation(): void {
    const idx = this.quickEditRowIndex_();
    if (idx === null || this.quickEditRowClosingIndex_() !== null) return;
    this.quickEditRowClosingIndex_.set(idx);
    setTimeout(() => {
      this.quickEditRowClosingIndex_.set(null);
      this.quickEditRowIndex_.set(null);
      this.quickEditRowTier_.set(null);
    }, 200);
  }

  /** Called when the accordion panel emits saved. Closes with animation. */
  protected onQuickEditSaved(_index: number): void {
    this.closeQuickEditWithAnimation();
    // KitchenStateService.products_() is already updated by ProductDataService.updateProduct().
    // The existing effect() in the constructor fires and calls refreshAllLineCalculations().
  }

  /** Only cancel editing on the row that is actually being edited — prevents empty-row searches from wiping another row's edit mode. */
  protected onCancelSearch(rowIndex: number): void {
    if (this.editingNameAtRow_() === rowIndex) {
      this.editingNameAtRow_.set(null);
    }
  }

  /** Exclude names from search for a given row (other rows only), so user can re-select the same item when editing. */
  getExcludeNamesForRow(rowIndex: number): string[] {
    return this.ingredientGroups
      .filter((g, i) => i !== rowIndex && g.get('referenceId')?.value)
      .map(g => (g.get('name_hebrew')?.value ?? '').toString().trim())
      .filter(Boolean);
  }



  /** True when the row's unit is a product purchase unit (use step 1 for +/-). */
  private isPurchaseUnitRow(group: FormGroup): boolean {
    const item = this.getItemMetadata(group);
    if (!item || (item as { item_type_?: string }).item_type_ !== 'product') return false;
    const prod = item as Product;
    const unit = group.get('unit')?.value;
    return prod.purchase_options_?.some(o => o.unit_symbol_ === unit) ?? false;
  }

  incrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net');
    const current = ctrl?.value ?? 0;
    const unit = group.get('unit')?.value as string | undefined;
    const stepOpts: QuantityStepOptions = this.isPurchaseUnitRow(group) ? { integerOnly: true } : (unit ? { unit } : {});
    ctrl?.setValue(quantityIncrement(current, 0, stepOpts));
    this.updateLineCalculations(index);
  }

  decrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net');
    const current = ctrl?.value ?? 0;
    const unit = group.get('unit')?.value as string | undefined;
    const stepOpts: QuantityStepOptions = this.isPurchaseUnitRow(group) ? { integerOnly: true } : (unit ? { unit } : {});
    ctrl?.setValue(quantityDecrement(current, 0, stepOpts));
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
    const index = this.ingredientGroups.indexOf(group);
    const isEditingName = this.editingNameAtRow_() === index;
    const product = item.item_type_ === 'product' ? (item as Product) : null;
    const hasPurchaseOptions = product?.purchase_options_?.length;
    const unit = hasPurchaseOptions
      ? (product!.purchase_options_![0].unit_symbol_ ?? product!.base_unit_ ?? '')
      : ('base_unit_' in item ? (item.base_unit_ ?? '') : ('yield_unit_' in item ? (item.yield_unit_ ?? '') : ''));
    const amount_net = isEditingName
      ? (group.get('amount_net')?.value ?? (hasPurchaseOptions ? 1 : 0))
      : (hasPurchaseOptions ? 1 : 0);
    group.patchValue({
      name_hebrew: item.name_hebrew,
      nameSnapshot: item.name_hebrew,
      referenceId: item._id,
      item_type: item.item_type_,
      unit,
      amount_net,
    });

    if (index !== -1) {
      this.updateLineCalculations(index);
    }

    this.editingNameAtRow_.set(null);

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
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const group = this.ingredientsFormArray().at(rowIndex) as FormGroup;
      const ctrl = group?.get('amount_net');
      if (!ctrl) return;
      e.preventDefault();
      const current = ctrl.value ?? 0;
      const unit = group.get('unit')?.value as string | undefined;
      const stepOpts: QuantityStepOptions = this.isPurchaseUnitRow(group) ? { integerOnly: true } : (unit ? { unit } : {});
      const next = e.key === 'ArrowUp'
        ? quantityIncrement(current, 0, stepOpts)
        : quantityDecrement(current, 0, stepOpts);
      ctrl.setValue(next);
      this.updateLineCalculations(rowIndex);
      return;
    }
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
    group.updateValueAndValidity();
    this.ingredientsFormArray().updateValueAndValidity();
  }

  protected getDisplayName(group: FormGroup): string {
    const refId = group.get('referenceId')?.value as string | null
    const type = group.get('item_type')?.value as 'product' | 'recipe' | null
    if (refId) {
      const pool = type === 'recipe'
        ? this.kitchenStateService.recipes_()
        : this.kitchenStateService.products_()
      const found = pool.find(x => x._id === refId)
      if (found?.name_hebrew) return found.name_hebrew
    }
    return (group.get('name_hebrew')?.value || group.get('nameSnapshot')?.value || '') as string
  }

  getItemMetadata(group: FormGroup) {
    const id = group.get('referenceId')?.value;
    const type = group.get('item_type')?.value;
    return type === 'product'
      ? this.kitchenStateService.products_().find(p => p._id === id)
      : this.kitchenStateService.recipes_().find(r => r._id === id);
  }

  /** True when the row is blocking — must be resolved before the recipe can be saved. */
  isBlockingRow(group: FormGroup): boolean {
    const refId = group.get('referenceId')?.value as string | null
    if (!refId) return false
    const type = group.get('item_type')?.value as 'product' | 'recipe' | null
    const pool = type === 'recipe' ? this.kitchenStateService.recipes_() : this.kitchenStateService.products_()
    const found = pool.find(x => x._id === refId)
    // Unlinked: referenceId not found in pool
    if (!found) return true
    // Product is in the invalid tier (missing name or base unit)
    if (type === 'product') {
      return getProductValidationStatus(found as Product) === 'invalid'
    }
    return false
  }

  /** True when the row has a name but no referenceId (draft/unlinked ingredient). */
  isUnlinkedRow(group: FormGroup): boolean {
    return !!(group.get('name_hebrew')?.value?.trim()) && !group.get('referenceId')?.value
  }

  /** True when any ingredient row is unlinked (has name but no referenceId). */
  hasUnlinkedRows(): boolean {
    return this.ingredientGroups.some(g => this.isUnlinkedRow(g))
  }

  /** True when the row is linked to a product that is in the incomplete (warning) tier. */
  isWarningRow(group: FormGroup): boolean {
    if (this.isBlockingRow(group)) return false
    const refId = group.get('referenceId')?.value as string | null
    if (!refId) return false
    if (group.get('item_type')?.value !== 'product') return false
    const product = this.kitchenStateService.products_().find(p => p._id === refId)
    if (!product) return false
    return getProductValidationStatus(product) === 'incomplete'
  }

  /** True when any ingredient row is blocking. Used by recipe-builder to gate save. */
  hasBlockingRows(): boolean {
    return this.ingredientGroups.some(g => this.isBlockingRow(g))
  }

  /** Navigate to the full product edit form so the user can complete the product. */
  navigateToEditProduct(group: FormGroup): void {
    const id = group.get('referenceId')?.value
    if (!id) return
    void this.router_.navigate(['/inventory/edit', id])
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
      const amountInYieldUnit = this.recipeCostService.amountInRecipeYieldUnit(netAmount, selectedUnit, recipe);
      lineCost = amountInYieldUnit * costPerUnit;
    } else {
      const prod = item as { base_unit_?: string; purchase_options_?: { unit_symbol_: string; conversion_rate_?: number; price_override_?: number }[]; buy_price_global_?: number; yield_factor_?: number; calculated_cost_per_unit?: number };
      const unitOption = prod.purchase_options_?.find(o => o.unit_symbol_ === selectedUnit);

      if (unitOption) {
        if (unitOption.price_override_ != null && unitOption.price_override_ > 0) {
          lineCost = netAmount * unitOption.price_override_;
        } else {
          const normalizedAmount = netAmount * (unitOption.conversion_rate_ || 1);
          const price = prod.buy_price_global_ || 0;
          const yieldFactor = prod.yield_factor_ || 1;
          lineCost = (normalizedAmount / yieldFactor) * price;
        }
      } else {
        // Selected unit not in purchase_options_ (e.g. base unit or custom like כפית): convert to product base unit.
        const price = prod.buy_price_global_ || prod.calculated_cost_per_unit || 0;
        const yieldFactor = prod.yield_factor_ || 1;
        const baseUnit = prod.base_unit_ || 'gram';
        const amountG = this.recipeCostService.convertToBaseUnits(netAmount, selectedUnit);
        const baseGPerUnit = this.recipeCostService.convertToBaseUnits(1, baseUnit) || 1;
        const amountInBaseUnit = amountG / baseGPerUnit;
        lineCost = (amountInBaseUnit / yieldFactor) * price;
      }
    }

    group.get('total_cost')?.setValue(lineCost);
    this.ingredientsFormArray().parent?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  /** Re-run line cost for every row with referenceId (e.g. when products/recipes load). */
  private refreshAllLineCalculations(): void {
    const groups = this.ingredientGroups;
    if (!groups.length) return;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].get('referenceId')?.value) this.updateLineCalculations(i);
    }
    this.cdr.markForCheck();
  }

  getAvailableUnits(group: FormGroup): string[] {
    const item = this.getItemMetadata(group);
    if (!item) {
      const current = group.get('unit')?.value as string | null
      const defaults = new Set(['gram', 'kg', 'unit'])
      if (current) defaults.add(current)
      return Array.from(defaults)
    }

    const units = new Set<string>();
    const meta = item as {
      base_unit_?: string;
      purchase_options_?: { unit_symbol_?: string }[];
      unit_options_?: { unit_symbol_?: string }[];
      yield_unit_?: string;
      yield_conversions_?: { amount: number; unit: string }[];
    };

    if (meta.base_unit_) units.add(meta.base_unit_);
    if (meta.purchase_options_?.length) {
      meta.purchase_options_.forEach(o => { if (o.unit_symbol_) units.add(o.unit_symbol_); });
    }
    if (meta.unit_options_?.length) {
      meta.unit_options_.forEach(o => { if (o.unit_symbol_) units.add(o.unit_symbol_); });
    }
    if (meta.yield_unit_) units.add(meta.yield_unit_);
    if (meta.yield_conversions_?.length) {
      meta.yield_conversions_.forEach(c => { if (c?.unit) units.add(c.unit); });
    }

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
      const product = group.get('item_type')?.value === 'product' ? (this.getItemMetadata(group) as Product | undefined) : undefined;
      const existingSymbols = product?.purchase_options_?.map((o) => o.unit_symbol_) ?? [];
      setTimeout(() => this.unitRegistry.openUnitCreator({ existingUnitSymbols: existingSymbols }), 0);
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe(newUnit => {
        const setUnitAndUpdate = (): void => {
          group.get('unit')?.setValue(newUnit);
          this.updateLineCalculations(index);
        };
        if (group.get('item_type')?.value === 'product') {
          const prod = this.getItemMetadata(group) as Product | undefined;
          if (prod && prod._id) {
            const existing = prod.purchase_options_?.some(o => o.unit_symbol_ === newUnit);
            if (!existing) {
              const baseFactor = this.unitRegistry.getConversion(prod.base_unit_) || 1;
              const unitFactor = this.unitRegistry.getConversion(newUnit) || 1;
              // conversion_rate_ = base units per 1 purchase unit (e.g. 0.33 kg per jar when 1 jar = 330g)
              const conversion_rate_ = baseFactor > 0 && unitFactor > 0 ? unitFactor / baseFactor : 1;
              const newOption = {
                unit_symbol_: newUnit,
                conversion_rate_,
                uom: prod.base_unit_,
                price_override_: 0
              };
              const updated: Product = {
                ...prod,
                purchase_options_: [...(prod.purchase_options_ ?? []), newOption]
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

}