import { Component, input, inject, output, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { KitchenStateService } from '@services/kitchen-state.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { TranslationService } from '@services/translation.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service';
import { CustomMultiSelectComponent } from 'src/app/shared/custom-multi-select/custom-multi-select.component';
import { ScalingChipComponent } from 'src/app/shared/scaling-chip/scaling-chip.component';
import { ScrollIndicatorsDirective } from '@directives/scroll-indicators.directive';
import { quantityIncrement, quantityDecrement } from 'src/app/core/utils/quantity-step.util';

@Component({
  selector: 'app-recipe-header',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ClickOutSideDirective, TranslatePipe, CustomMultiSelectComponent, ScalingChipComponent, ScrollIndicatorsDirective],
  templateUrl: './recipe-header.component.html',
  styleUrl: './recipe-header.component.scss'
})
export class RecipeHeaderComponent {
  // INJECTED
  private fb = inject(FormBuilder);
  private unitRegistryService = inject(UnitRegistryService);
  private kitchenStateService = inject(KitchenStateService);
  private metadataRegistry = inject(MetadataRegistryService);
  private translationService = inject(TranslationService);
  private labelCreationModal = inject(LabelCreationModalService);
  private cdr = inject(ChangeDetectorRef);

  // INPUTS
  form = input.required<FormGroup>();
  recipeType = input<'dish' | 'preparation'>();
  imageUrl = input<string | null>(null);
  currentCost = input<number>(0);
  totalWeightG = input<number>(0);
  totalBrutoWeightG = input<number>(0);
  totalVolumeL = input<number>(0);
  totalVolumeMl = input<number>(0);
  unconvertibleForWeight = input<string[]>([]);
  unconvertibleForVolume = input<string[]>([]);
  resetTrigger = input<number>(0);
  autoLabels = input<string[]>([]);

  // LABELS
  /** Options for multi-select: all labels (with color) + create-new. Component filters dropdown to available. */
  protected labelMultiSelectOptions_ = computed(() => {
    const all = this.metadataRegistry.allLabels_().map((l) => ({
      value: l.key,
      label: l.key,
      color: l.color
    }));
    return [...all, { value: '__add_label__', label: 'create_new_label' }];
  });

  protected get labelsControl(): FormControl<string[]> {
    return this.form().get('labels') as FormControl<string[]>;
  }

  protected hasManualLabels_ = computed(() => {
    const arr = (this.form().get('labels')?.value ?? []) as string[];
    return arr.length > 0;
  });

  /** True when the labels container shows any chips (manual or auto) — used to show "Clear all" button. */
  protected hasAnyLabelsInContainer_ = computed(() => {
    const manual = (this.form().get('labels')?.value ?? []) as string[];
    const auto = this.autoLabels();
    return manual.length > 0 || auto.length > 0;
  });

  // OUTPUTS
  openUnitCreator = output<string>();

  /** When scaling-chip "add new unit" is used: open creator and set the new unit on the chip that requested it. */
  protected onCreateUnit(secondaryChipIndex?: number): void {
    this.unitRegistryService.openUnitCreator();
    this.unitRegistryService.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
      if (secondaryChipIndex === undefined) {
        this.setPrimaryUnit(newUnit);
      } else {
        this.changeSecondaryUnit(secondaryChipIndex, newUnit);
      }
    });
  }

  // SIGNALS & CONSTANTS
  readonly placeholderPath = 'assets/style/img/recipe_placeholder.png';
  activeUnit = signal<string | null>(null);

  private manualTrigger_ = signal(0);

  private allUnitKeys_ = this.unitRegistryService.allUnitKeys_;

  protected usedUnits_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const conversions = this.form().get('yield_conversions') as FormArray;
    if (!conversions?.length) return new Set<string>();
    return new Set(conversions.value.map((c: { unit?: string }) => c.unit).filter(Boolean));
  });

  protected availablePrimaryUnits_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const all = this.allUnitKeys_();
    const conversions = this.form().get('yield_conversions') as FormArray;
    const usedSecondary = conversions?.length > 1
      ? new Set(conversions.controls.slice(1).map(c => c.get('unit')?.value).filter(Boolean))
      : new Set<string>();
    return all.filter(u => !usedSecondary.has(u));
  });

  /** Options for primary scaling-chip unit select (value/label + create new unit). */
  protected primaryUnitOptions_ = computed(() => {
    const units = this.availablePrimaryUnits_().map(u => ({ value: u, label: u }));
    return [...units, { value: '__add_unit__', label: 'create_new_unit' }];
  });

  protected availableSecondaryUnits_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const all = this.allUnitKeys_();
    const used = this.usedUnits_();
    return all.filter(u => !used.has(u));
  });
  // COMPUTED SIGNALS
  /** Current recipe type for display (dish vs prep). Form is source of truth so header updates immediately on toggle. */
  protected currentRecipeTypeDisplay_ = computed(() => {
    this.manualTrigger_();
    const fromForm = this.form().get('recipe_type')?.value;
    const type = fromForm ?? this.recipeType();
    return type === 'dish' ? 'dish' : 'prep';
  });

  protected primaryUnitLabel_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const f = this.form();
    const type = f.get('recipe_type')?.value;

    if (type === 'dish') return 'dish';

    const conversions = f.get('yield_conversions') as FormArray;
    return conversions?.at(0)?.get('unit')?.value ?? 'gram';
  });

  protected primaryAmount_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const f = this.form();
    const type = f.get('recipe_type')?.value;

    if (type === 'dish') {
      return f.get('serving_portions')?.value ?? 1;
    }

    const conversions = f.get('yield_conversions') as FormArray;
    return conversions?.at(0)?.get('amount')?.value ?? 0;
  });

  //LIST
  setPrimaryUnit(newUnit: string): void {
    const type = this.form().get('recipe_type')?.value;

    if (type === 'dish') {
      if (newUnit !== 'dish') {
        this.form().get('recipe_type')?.setValue('preparation');
        const conversions = this.form().get('yield_conversions') as FormArray;
        const portions = this.form().get('serving_portions')?.value ?? 1;
        if (conversions?.length > 0) {
          conversions.at(0).patchValue({ unit: newUnit, amount: portions });
        }
      }
    } else {
      const conversions = this.form().get('yield_conversions') as FormArray;
      if (conversions?.length > 0) {
        conversions.at(0).get('unit')?.setValue(newUnit);
      }
    }
    this.activeUnit.set(null);
    this.manualTrigger_.update(v => v + 1);
  }


  // METHODS

  onPrimaryUnitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    if (value === 'NEW_UNIT') {
      // Emit the output to open the unit creator modal
      this.openUnitCreator.emit('unit');
      // Reset the select display to show the current unit again
      select.value = this.primaryUnitLabel_();
      return;
    }

    // Otherwise, update the form value
    this.setPrimaryUnit(value);
  }

  addSecondaryUnit(unitSymbol: string): void {
    const conversions = this.form().get('yield_conversions') as FormArray;
    // Safety check: Don't add if unit already exists in the conversions
    const exists = conversions.value.some((c: { amount: number; unit: string }) => c.unit === unitSymbol);
    if (exists) {
      this.activeUnit.set(null); // Just close the menu
      return;
    }

    const newUnitGroup = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: [unitSymbol]
    });

    conversions.push(newUnitGroup);

    // Refresh UI trigger
    this.manualTrigger_.update(v => v + 1);
    this.activeUnit.set(null);
  }

  updatePrimaryAmount(delta: number): void {
    const current = this.primaryAmount_();
    const type = this.form().get('recipe_type')?.value;
    const min = type === 'dish' ? 1 : 0;
    const next = delta > 0
      ? quantityIncrement(current, min, undefined)
      : quantityDecrement(current, min, undefined);
    this.applyPrimaryUpdate(next);
  }

  onAmountManualChange(rawValue: string): void {
    const parsedValue = parseFloat(rawValue);
    if (!isNaN(parsedValue)) {
      this.applyPrimaryUpdate(parsedValue);
    }
  }

  onScalingChipAmountChange(value: number): void {
    this.applyPrimaryUpdate(value);
  }

  private applyPrimaryUpdate(newValue: number): void {
    const type = this.form().get('recipe_type')?.value;
    const sanitizedValue = Math.max(type === 'dish' ? 1 : 0, newValue);

    if (type === 'dish') {
      this.form().get('serving_portions')?.setValue(sanitizedValue, { emitEvent: true });
    } else {
      const conversions = this.form().get('yield_conversions') as FormArray;
      conversions.at(0).get('amount')?.setValue(sanitizedValue, { emitEvent: true });
    }

    this.manualTrigger_.update(v => v + 1);

    this.form().updateValueAndValidity({ emitEvent: true });
  }



  toggleType(): void {
    const current = this.form().get('recipe_type')?.value;
    const conversions = this.form().get('yield_conversions') as FormArray;
    if (current === 'dish') {
      this.form().get('recipe_type')?.setValue('preparation');
      if (conversions?.length > 0) {
        const portions = this.form().get('serving_portions')?.value ?? 1;
        conversions.at(0).patchValue({ amount: portions, unit: 'gram' });
      }
    } else {
      this.form().get('recipe_type')?.setValue('dish');
      if (conversions?.length > 0) {
        const amount = conversions.at(0).get('amount')?.value ?? 1;
        this.form().get('serving_portions')?.setValue(Math.max(1, amount), { emitEvent: true });
        conversions.at(0).patchValue({ unit: 'dish' });
      }
    }
    this.manualTrigger_.update(v => v + 1);
    this.form().updateValueAndValidity({ emitEvent: true });
    this.cdr.markForCheck();
  }

  setActiveUnit(unit: string) {
    this.activeUnit.set(this.activeUnit() === unit ? null : unit);
  }

  /** Weight vs volume display in metrics-square. */
  metricsDisplayMode_ = signal<'weight' | 'volume'>('weight');
  /** Whether the unconvertible-names floating list is open (mobile click). */
  metricsNoticeOpen_ = signal(false);

  toggleMetricsDisplayMode(): void {
    this.metricsDisplayMode_.update(m => m === 'weight' ? 'volume' : 'weight');
    this.metricsNoticeOpen_.set(false);
  }

  toggleMetricsNotice(): void {
    this.metricsNoticeOpen_.update(v => !v);
  }

  closeMetricsNotice(): void {
    this.metricsNoticeOpen_.set(false);
  }

  private metricsNoticeCloseTimeout_: ReturnType<typeof setTimeout> | null = null;

  /** Keep floating open when hovering metrics box or floating panel; close only when leaving both. */
  onMetricsNoticeZoneEnter(): void {
    if (this.metricsNoticeCloseTimeout_ != null) {
      clearTimeout(this.metricsNoticeCloseTimeout_);
      this.metricsNoticeCloseTimeout_ = null;
    }
    if (this.unconvertibleNamesFiltered_().length > 0) {
      this.metricsNoticeOpen_.set(true);
    }
  }

  onMetricsNoticeZoneLeave(): void {
    if (this.metricsNoticeCloseTimeout_ != null) {
      clearTimeout(this.metricsNoticeCloseTimeout_);
    }
    this.metricsNoticeCloseTimeout_ = setTimeout(() => {
      this.metricsNoticeCloseTimeout_ = null;
      this.metricsNoticeOpen_.set(false);
    }, 150);
  }

  /** Unconvertible names for the current scale (weight or volume). */
  protected unconvertibleNamesForCurrentMode_ = computed(() => {
    return this.metricsDisplayMode_() === 'weight'
      ? this.unconvertibleForWeight()
      : this.unconvertibleForVolume();
  });

  /** Non-empty names only; use for icon visibility and list content so we never show icon or empty container. */
  protected unconvertibleNamesFiltered_ = computed(() =>
    this.unconvertibleNamesForCurrentMode_().filter((n) => (n != null && String(n).trim().length > 0))
  );

  /** Show alert icon only in volume mode and only when there are unconverted (unconvertible) volume values. */
  protected showMetricsNoticeIcon_ = computed(() =>
    this.metricsDisplayMode_() === 'volume' && this.unconvertibleNamesFiltered_().length > 0
  );

  /** Units available for a secondary chip: exclude every unit already in use (primary + all secondaries). */
  availableUnitsForSecondaryChip_(chipIdx: number): string[] {
    const conversions = this.form().get('yield_conversions') as FormArray;
    const used = new Set<string>();
    conversions.controls.forEach((c) => {
      const u = c.get('unit')?.value;
      if (u) used.add(u);
    });
    return this.allUnitKeys_().filter(u => !used.has(u));
  }

  /** Unit options for a secondary scaling-chip select (current unit + available + create new). */
  getSecondaryUnitOptions(chipIdx: number): { value: string; label: string }[] {
    const available = this.availableUnitsForSecondaryChip_(chipIdx);
    const group = this.secondaryConversions[chipIdx];
    const currentUnit = group?.get('unit')?.value;
    let units = available;
    if (currentUnit && !available.includes(currentUnit)) {
      units = [currentUnit, ...available];
    }
    const options = units.map(u => ({ value: u, label: u }));
    return [...options, { value: '__add_unit__', label: 'create_new_unit' }];
  }

  onSecondaryScalingChipAmountChange(chipIdx: number, value: number): void {
    const conversions = this.form().get('yield_conversions') as FormArray;
    const groupIndex = chipIdx + 1;
    if (groupIndex >= conversions.length) return;
    const group = conversions.at(groupIndex) as FormGroup;
    const amountControl = group.get('amount');
    if (amountControl) {
      amountControl.setValue(Math.max(0, value), { emitEvent: true });
    }
    this.manualTrigger_.update(v => v + 1);
  }

  changeSecondaryUnit(chipIndex: number, newUnit: string): void {
    const conversions = this.form().get('yield_conversions') as FormArray;
    const groupIndex = chipIndex + 1;
    if (groupIndex >= conversions.length) return;
    const group = conversions.at(groupIndex) as FormGroup;
    const currentUnit = group.get('unit')?.value;
    if (currentUnit === newUnit) return;
    const exists = conversions.controls.some((c, i) => i !== groupIndex && c.get('unit')?.value === newUnit);
    if (exists) return;
    group.get('unit')?.setValue(newUnit, { emitEvent: true });
    this.manualTrigger_.update(v => v + 1);
    this.cdr.detectChanges();
  }

  /** Add a secondary chip immediately with amount=1 and first available unit. */
  addSecondaryChipWithDefault(): void {
    const available = this.availableSecondaryUnits_();
    if (available.length === 0) return;
    const defaultUnit = available[0];
    this.addSecondaryUnit(defaultUnit);
    const conversions = this.form().get('yield_conversions') as FormArray;
    const last = conversions.at(conversions.length - 1) as FormGroup;
    last.get('amount')?.setValue(1, { emitEvent: true });
    this.manualTrigger_.update(v => v + 1);
  }

  onSecondaryAmountInput(group: FormGroup, rawValue: string): void {
    const parsed = parseFloat(rawValue);
    const amountControl = group.get('amount');
    if (amountControl) {
      amountControl.patchValue(isNaN(parsed) ? 0 : Math.max(0, parsed), { emitEvent: true });
    }
    this.manualTrigger_.update(v => v + 1);
  }

  updateSecondaryAmount(index: number, delta: number): void {
    const conversions = this.form().get('yield_conversions') as FormArray;
    const groupIndex = index + 1;
    if (groupIndex >= conversions.length) return;
    const group = conversions.at(groupIndex) as FormGroup;
    const amountControl = group.get('amount');
    if (!amountControl) return;
    const current = amountControl.value ?? 0;
    const next = delta > 0
      ? quantityIncrement(current, 0, undefined)
      : quantityDecrement(current, 0, undefined);
    amountControl.setValue(Math.max(0, next), { emitEvent: true });
    this.manualTrigger_.update(v => v + 1);
  }

  protected onPrimaryAmountKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const current = this.primaryAmount_();
    const type = this.form().get('recipe_type')?.value;
    const min = type === 'dish' ? 1 : 0;
    const next = e.key === 'ArrowUp'
      ? quantityIncrement(current, min, undefined)
      : quantityDecrement(current, min, undefined);
    this.applyPrimaryUpdate(next);
  }

  protected onSecondaryAmountKeydown(e: KeyboardEvent, index: number): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    this.updateSecondaryAmount(index, e.key === 'ArrowUp' ? 1 : -1);
  }

  //DELETE
  removeSecondaryUnit(index: number): void {
    const conversions = this.form().get('yield_conversions') as FormArray;
    // We add 1 because index 0 is always the Primary Unit
    conversions.removeAt(index + 1);
    this.manualTrigger_.update(v => v + 1);
  }

  //GETTERS

  get secondaryConversions(): FormGroup[] {
    const conversions = this.form().get('yield_conversions') as FormArray;
    if (!conversions?.length) return [];
    return conversions.controls.slice(1) as FormGroup[];
  }

  protected clearAllManualLabels(): void {
    this.form().get('labels')?.setValue([], { emitEvent: true });
  }

  protected async openCreateLabel(): Promise<void> {
    const result = await this.labelCreationModal.open();
    if (!result?.key || !result?.hebrewLabel) return;
    try {
      this.translationService.updateDictionary(result.key, result.hebrewLabel);
      await this.metadataRegistry.registerLabel(result.key, result.color, result.autoTriggers);
      const current = (this.form().get('labels')?.value ?? []) as string[];
      if (!current.includes(result.key)) {
        this.form().get('labels')?.setValue([...current, result.key], { emitEvent: true });
      }
    } catch {
      // Error already shown by registry
    }
  }
}