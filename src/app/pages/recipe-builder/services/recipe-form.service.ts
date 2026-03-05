import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { UnitRegistryService } from '@services/unit-registry.service';
import type { BaselineEntry } from '@models/logistics.model';

/** Item shape used when creating an ingredient row (product/recipe with optional fields). */
export interface IngredientRowItem {
  _id?: string;
  name_hebrew?: string;
  item_type_?: string;
  base_unit_?: string;
  yield_percentage?: number;
}

@Injectable({ providedIn: 'root' })
export class RecipeFormService {
  private readonly fb = inject(FormBuilder);
  private readonly unitRegistry = inject(UnitRegistryService);

  /** Require amount > 0 when referenceId is set; empty rows are valid. */
  ingredientRowValidator(control: AbstractControl): ValidationErrors | null {
    const refId = control.get('referenceId')?.value;
    const amount = control.get('amount_net')?.value;
    if (!refId) return null;
    if (amount == null || amount === '') return { required: true };
    const numAmt = typeof amount === 'number' ? amount : Number(amount);
    if (isNaN(numAmt) || numAmt <= 0) return { min: true };
    return null;
  }

  createIngredientGroup(item: IngredientRowItem | null = null): FormGroup {
    return this.fb.group(
      {
        referenceId: [item?._id ?? null],
        item_type: [item?.item_type_ ?? null],
        name_hebrew: [item?.name_hebrew ?? ''],
        amount_net: [item ? 1 : null, [Validators.min(0)]],
        yield_percentage: [item?.yield_percentage ?? 1],
        unit: [item?.base_unit_ ?? 'gram'],
        total_cost: [{ value: 0, disabled: true }]
      },
      { validators: (c) => this.ingredientRowValidator(c) }
    );
  }

  createStepGroup(order: number): FormGroup {
    return this.fb.group({
      order: [order],
      instruction: [''],
      labor_time: [0]
    });
  }

  createPrepItemRow(row?: {
    preparation_name?: string;
    category_name?: string;
    main_category_name?: string;
    quantity?: number;
    unit?: string;
  }): FormGroup {
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

  createBaselineRow(entry?: BaselineEntry): FormGroup {
    return this.fb.group({
      equipment_id_: [entry?.equipment_id_ ?? '', Validators.required],
      quantity_: [entry?.quantity_ ?? 1, [Validators.required, Validators.min(0)]],
      phase_: [entry?.phase_ ?? 'both'],
      is_critical_: [entry?.is_critical_ ?? true],
      notes_: [entry?.notes_ ?? '']
    });
  }
}
