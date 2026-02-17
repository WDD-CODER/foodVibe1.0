import { Component, input, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, Validators, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { KitchenStateService } from '@services/kitchen-state.service';
import { UnitRegistryService } from '@services/unit-registry.service';

@Component({
  selector: 'app-recipe-header',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SelectOnFocusDirective],
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

  // OUTPUTS
  openUnitCreator = output<string>();

  // SIGNALS & CONSTANTS
  readonly placeholderPath = 'assets/style/img/recipe_placeholder.png';
  activeUnit = signal<string | null>(null);

  private manualTrigger_ = signal(0);

  protected availableUnits_ = this.unitRegistryService.allUnitKeys_
  // COMPUTED SIGNALS
  protected primaryUnitLabel_ = computed(() => {
    this.manualTrigger_();
    const f = this.form();
    const type = f.get('recipe_type')?.value;

    if (type === 'dish') return 'מנות';

    const conversions = f.get('yield_conversions') as FormArray;
    return conversions?.at(0)?.get('unit')?.value ?? 'gr';
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
    this.form().get('recipe_type')?.setValue(current === 'dish' ? 'preparation' : 'dish');
    this.form().updateValueAndValidity({ emitEvent: true });
  }

  setActiveUnit(unit: string) {
    this.activeUnit.set(this.activeUnit() === unit ? null : unit);
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

  get secondaryConversions() {
    const conversions = this.form().get('yield_conversions') as FormArray;
    // .controls gives us the individual FormGroups for the @for loop
    return conversions ? conversions.controls.slice(1) : [];
  }
}