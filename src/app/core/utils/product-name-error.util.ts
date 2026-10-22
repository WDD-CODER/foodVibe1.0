import { HttpErrorResponse } from '@angular/common/http'
import type { Product } from '@models/product.model'
import { normalizeProductName } from 'src/app/core/utils/product-name.util'

/** Plan 485: the server refused a product because another live product of the business has its name. */
export function isProductNameTaken(err: unknown): boolean {
  return (
    err instanceof HttpErrorResponse &&
    err.status === 409 &&
    (err.error as { error?: unknown } | null)?.error === 'PRODUCT_NAME_TAKEN'
  )
}

/** The live product (other than `exceptId`) whose name equals `name` by the one name rule, if any. */
export function findProductByName(
  products: readonly Product[],
  name: string,
  exceptId: string | null = null
): Product | null {
  const key = normalizeProductName(name)
  if (!key) return null
  return products.find((p) => p._id !== exceptId && normalizeProductName(p.nameHebrew) === key) ?? null
}
