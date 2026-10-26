import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'
import { Product } from '@models/product.model'
import { normalizeProductName } from 'src/app/core/utils/product-name.util'

/**
 * Product name check by the one name rule (`normalizeProductName`: trim, single spaces, lower-case),
 * the same rule as the price-list import. The product being edited never clashes with itself, and keeping its
 * saved name is always allowed (plan 484).
 */
export function duplicateNameValidator(
  productsSignal: () => Product[],
  currentId?: string | null | (() => string | null)
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = normalizeProductName(control.value)
    if (!val) return null
    const id = typeof currentId === 'function' ? currentId() : (currentId ?? null)
    const products = productsSignal()
    // Plan 484: an existing product keeps its saved name even when a twin has it (old duplicate data), so only a
    // changed name is checked.
    const saved = id ? products.find((p) => p._id === id) : undefined
    if (saved && normalizeProductName(saved.nameHebrew) === val) return null
    const isDuplicate = products.some((p) => normalizeProductName(p.nameHebrew) === val && p._id !== id)
    return isDuplicate ? { duplicateName: true } : null
  }
}

export function duplicateEntityNameValidator<T extends { nameHebrew: string; _id: string }>(
  itemsSignal: () => T[],
  currentId?: string | null | (() => string | null)
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value?.trim().toLowerCase()
    if (!val) return null

    const id = typeof currentId === 'function' ? currentId() : (currentId ?? null)
    const isDuplicate = itemsSignal().some((item) => item.nameHebrew.trim().toLowerCase() === val && item._id !== id)

    return isDuplicate ? { duplicateName: true } : null
  }
}
