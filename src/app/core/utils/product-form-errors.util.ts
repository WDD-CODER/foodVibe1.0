import type { AbstractControl } from '@angular/forms'

/** Form control name -> translation key of the label the chef sees on the page. */
const FIELD_LABEL_KEYS: Readonly<Record<string, string>> = {
  productName: 'product_name',
  baseUnit: 'base_unit',
  buy_price_global_: 'buy_price',
  purchaseOptions: 'purchase_units_section',
  yieldFactor: 'yield_factor',
  waste_percent_: 'waste_percent',
  minStockLevel: 'min_stock_level',
  expiryDaysDefault: 'expiry_days_default'
}

/** Text boxes the save check also rejects when they hold only spaces, although their validators pass. */
const BLANK_CHECKED = ['productName', 'baseUnit']

/** Label keys of the invalid fields of a product form, in the order of the page. */
export function invalidFieldLabelKeys(controls: Record<string, AbstractControl>): string[] {
  const isBlank = (name: string) => BLANK_CHECKED.includes(name) && !String(controls[name]?.value ?? '').trim()
  return Object.keys(FIELD_LABEL_KEYS)
    .filter((name) => controls[name]?.invalid || isBlank(name))
    .map((name) => FIELD_LABEL_KEYS[name])
}

/**
 * The top message of a failed save: «יש לתקן: שם הפריט, יחידות רכש». Falls back to the plain
 * message when no known field is invalid. `translator` turns a key into the on-screen text.
 */
export function failedSaveMessage(
  controls: Record<string, AbstractControl>,
  translator: { translate(key: string): string }
): string {
  const translate = (key: string) => translator.translate(key)
  const labels = invalidFieldLabelKeys(controls).map(translate)
  if (labels.length === 0) return translate('form_has_errors')
  return translate('form_has_errors_fields').replace('{{fields}}', labels.join(', '))
}
