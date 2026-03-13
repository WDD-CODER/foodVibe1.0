import { Component, input, inject, output, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { toSignal } from '@angular/core/rxjs-interop';
import { KitchenStateService } from '@services/kitchen-state.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { TranslationService } from '@services/translation.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';

@Component({
  selector: 'app-recipe-header',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SelectOnFocusDirective, ClickOutSideDirective, TranslatePipe, ScrollableDropdownComponent],
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
  protected labelDropdownOpen_ = signal(false);
  private labelTrigger_ = signal(0);
  protected selectedLabels_ = computed(() => {
    this.labelTrigger_();
    return (this.form().get('labels')?.value ?? []) as string[];
  });
  protected allLabelsForDisplay_ = computed(() => {
    this.labelTrigger_();
    return [...new Set([...this.selectedLabels_(), ...this.autoLabels()])];
  });
  protected filteredLabelOptions_ = computed(() =>
    this.metadataRegistry.allLabels_().filter(l => !this.allLabelsForDisplay_().includes(l.key))
  );
  /** All labels for manual toggle list in template (exposes registry without making service public). */
  protected allLabels_ = this.metadataRegistry.allLabels_;

  // OUTPUTS
  openUnitCreator = output<string>();

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
    const exists = conversions.value.some((c: any) => c.unit === unitSymbol);
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
    this.applyPrimaryUpdate(current + delta);
  }

  onAmountManualChange(rawValue: string): void {
    const parsedValue = parseFloat(rawValue);
    if (!isNaN(parsedValue)) {
      this.applyPrimaryUpdate(parsedValue);
    }
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

  /** Unconvertible names for the current scale (weight or volume). */
  protected unconvertibleNamesForCurrentMode_ = computed(() => {
    return this.metricsDisplayMode_() === 'weight'
      ? this.unconvertibleForWeight()
      : this.unconvertibleForVolume();
  });

  protected showMetricsNoticeIcon_ = computed(() => this.unconvertibleNamesForCurrentMode_().length > 0);

  /** Whether the primary chip unit dropdown is open. */
  activePrimaryEdit_ = signal<boolean>(false);

  setActivePrimaryEdit(open: boolean): void {
    this.activePrimaryEdit_.set(open);
    if (open) this.activeSecondaryEdit_.set(null);
  }

  /** Which secondary chip index has its unit dropdown open (null = none). */
  activeSecondaryEdit_ = signal<number | null>(null);

  /** Units available when changing a specific secondary chip's unit. */
  availableUnitsForSecondaryChip_(excludeIndex: number): string[] {
    const conversions = this.form().get('yield_conversions') as FormArray;
    const used = new Set<string>();
    used.add(conversions.at(0)?.get('unit')?.value ?? 'gram');
    conversions.controls.forEach((c, i) => {
      if (i > 0 && i !== excludeIndex + 1) used.add(c.get('unit')?.value);
    });
    return this.allUnitKeys_().filter(u => !used.has(u));
  }

  setActiveSecondaryEdit(index: number | null): void {
    this.activeSecondaryEdit_.set(this.activeSecondaryEdit_() === index ? null : index);
    if (index !== null) this.activePrimaryEdit_.set(false);
  }

  changeSecondaryUnit(chipIndex: number, newUnit: string): void {
    const conversions = this.form().get('yield_conversions') as FormArray;
    const groupIndex = chipIndex + 1;
    if (groupIndex >= conversions.length) return;
    const group = conversions.at(groupIndex) as FormGroup;
    const currentUnit = group.get('unit')?.value;
    if (currentUnit === newUnit) {
      this.activeSecondaryEdit_.set(null);
      return;
    }
    const exists = conversions.controls.some((c, i) => i !== groupIndex && c.get('unit')?.value === newUnit);
    if (exists) {
      this.activeSecondaryEdit_.set(null);
      return;
    }
    group.get('unit')?.setValue(newUnit);
    this.activeSecondaryEdit_.set(null);
    this.manualTrigger_.update(v => v + 1);
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
    const next = Math.max(0, current + delta);
    amountControl.setValue(next, { emitEvent: true });
    this.manualTrigger_.update(v => v + 1);
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

  protected setLabelDropdownOpen(open: boolean): void {
    this.labelDropdownOpen_.set(open);
  }

  protected addLabel(key: string): void {
    const current = (this.form().get('labels')?.value ?? []) as string[];
    if (current.includes(key)) return;
    this.form().get('labels')?.setValue([...current, key], { emitEvent: true });
    this.labelTrigger_.update(v => v + 1);
  }

  protected removeLabel(key: string): void {
    if (this.autoLabels().includes(key)) return;
    const current = (this.form().get('labels')?.value ?? []) as string[];
    this.form().get('labels')?.setValue(current.filter(k => k !== key), { emitEvent: true });
    this.labelTrigger_.update(v => v + 1);
  }

  protected isAutoLabel(key: string): boolean {
    return this.autoLabels().includes(key);
  }

  protected toggleManualLabel(key: string): void {
    const ctrl = this.form().get('labels');
    if (!ctrl) return;
    const current = (ctrl.value || []) as string[];
    if (current.includes(key)) {
      ctrl.setValue(current.filter(l => l !== key));
    } else {
      ctrl.setValue([...current, key]);
    }
    this.labelTrigger_.update(v => v + 1);
  }

  protected getLabelColor(key: string): string {
    return this.metadataRegistry.getLabelColor(key);
  }

  /** Returns white or dark text color for contrast on label chip background. */
  protected getLabelChipTextColor(key: string): string {
    let hex = this.metadataRegistry.getLabelColor(key).trim();
    if (hex.startsWith('#')) hex = hex.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) return '#0f172a';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#0f172a' : '#ffffff';
  }

  protected clearAllManualLabels(): void {
    this.form().get('labels')?.setValue([], { emitEvent: true });
    this.labelTrigger_.update(v => v + 1);
  }

  protected async openCreateLabel(): Promise<void> {
    const result = await this.labelCreationModal.open();
    if (!result?.key || !result?.hebrewLabel) return;
    try {
      this.translationService.updateDictionary(result.key, result.hebrewLabel);
      await this.metadataRegistry.registerLabel(result.key, result.color, result.autoTriggers);
      this.addLabel(result.key);
    } catch {
      // Error already shown by registry
    }
  }
}