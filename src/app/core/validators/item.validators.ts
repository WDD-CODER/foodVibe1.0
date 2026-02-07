import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Product } from '@models/product.model';

export function duplicateNameValidator(productsSignal: () => Product[], currentId?: string | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value?.trim().toLowerCase();
    if (!val) return null;

    // Logic: It is a duplicate ONLY if the name matches AND the ID is DIFFERENT
    const isDuplicate = productsSignal().some(p => 
      p.name_hebrew.toLowerCase() === val && p._id !== currentId
    );

    return isDuplicate ? { duplicateName: true } : null;
  };
}