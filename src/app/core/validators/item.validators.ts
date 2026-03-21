import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Product } from '@models/product.model';

export function duplicateNameValidator(
  productsSignal: () => Product[],
  currentId?: string | null | (() => string | null)
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value?.trim().toLowerCase();
    if (!val) return null;

    const id = typeof currentId === 'function' ? currentId() : currentId ?? null;
    const isDuplicate = productsSignal().some(
      p => p.name_hebrew.trim().toLowerCase() === val && p._id !== id
    );

    return isDuplicate ? { duplicateName: true } : null;
  };
}

export function duplicateEntityNameValidator<T extends { name_hebrew: string; _id: string }>(
  itemsSignal: () => T[],
  currentId?: string | null | (() => string | null)
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value?.trim().toLowerCase();
    if (!val) return null;

    const id = typeof currentId === 'function' ? currentId() : currentId ?? null;
    const isDuplicate = itemsSignal().some(
      item => item.name_hebrew.trim().toLowerCase() === val && item._id !== id
    );

    return isDuplicate ? { duplicateName: true } : null;
  };
}