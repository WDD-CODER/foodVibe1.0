import { Component, input, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { KitchenStateService } from '@services/kitchen-state.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-recipe-header',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SelectOnFocusDirective, TranslatePipe],
  templateUrl: './recipe-header.component.html',
  styleUrl: './recipe-header.component.scss'
})
export class RecipeHeaderComponent {
  // INJECTED
  private fb = inject(FormBuilder);
  private unitRegistryService = inject(UnitRegistryService);
  private kitchenStateService = inject(KitchenStateService);

  // INPUTS
  form = input.required<FormGroup>();
  imageUrl = input<string | null>(null);
  currentCost = input<number>(0);
  totalWeightG = input<number>(0);

  // OUTPUTS
  openUnitCreator = output<string>();

  // SIGNALS & CONSTANTS
  readonly placeholderPath = 'assets/style/img/recipe_placeholder.png';
  activeUnit = signal<string | null>(null);

  private manualTrigger_ = signal(0);

  private allUnitKeys_ = this.unitRegistryService.allUnitKeys_;

  protected usedUnits_ = computed(() => {
    this.manualTrigger_();
    const conversions = this.form().get('yield_conversions') as FormArray;
    if (!conversions?.length) return new Set<string>();
    return new Set(conversions.value.map((c: { unit?: string }) => c.unit).filter(Boolean));
  });

  protected availablePrimaryUnits_ = computed(() => {
    this.manualTrigger_();
    const all = this.allUnitKeys_();
    const conversions = this.form().get('yield_conversions') as FormArray;
    const usedSecondary = conversions?.length > 1
      ? new Set(conversions.controls.slice(1).map(c => c.get('unit')?.value).filter(Boolean))
      : new Set<string>();
    return all.filter(u => !usedSecondary.has(u));
  });

  protected availableSecondaryUnits_ = computed(() => {
    this.manualTrigger_();
    const all = this.allUnitKeys_();
    const used = this.usedUnits_();
    return all.filter(u => !used.has(u));
  });
  // COMPUTED SIGNALS
  protected primaryUnitLabel_ = computed(() => {
    this.manualTrigger_();
    const f = this.form();
    const type = f.get('recipe_type')?.value;

    if (type === 'dish') return 'dish';

    const conversions = f.get('yield_conversions') as FormArray;
    return conversions?.at(0)?.get('unit')?.value ?? 'gram';
  });

  protected primaryAmount_ = computed(() => {
    this.manualTrigger_()
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
    this.form().markAsDirty();
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
    this.form().markAsDirty();
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
    this.form().markAsDirty();
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
  }

  setActiveUnit(unit: string) {
    this.activeUnit.set(this.activeUnit() === unit ? null : unit);
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
    this.form().markAsDirty();
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
    this.form().markAsDirty();
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
    this.form().markAsDirty();
  }

  //DELETE
  removeSecondaryUnit(index: number): void {
    const conversions = this.form().get('yield_conversions') as FormArray;
    // We add 1 because index 0 is always the Primary Unit
    conversions.removeAt(index + 1);
    this.manualTrigger_.update(v => v + 1);
    this.form().markAsDirty();
  }

  //GETTERS

  get secondaryConversions(): FormGroup[] {
    const conversions = this.form().get('yield_conversions') as FormArray;
    if (!conversions?.length) return [];
    return conversions.controls.slice(1) as FormGroup[];
  }
}