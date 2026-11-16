import { Validators } from '@angular/forms'
import type { AbstractControl, FormArray, FormGroup, ValidatorFn } from '@angular/forms'
import type { TranslationService } from '@services/translation.service'

/** Plan 614: an item is blank when it has neither a recipe nor an unlinked dish name. */
function isBlankItem(item: AbstractControl): boolean {
  return !item.get('recipeId')?.value && !item.get('unlinkedName')?.value
}

/** Plan 614: recipeId is required, except on an unlinked dish (a name and no recipe yet). */
export function recipeIdValidators(unlinkedName: string | null | undefined): ValidatorFn[] {
  return unlinkedName ? [] : [Validators.required]
}

/** Rows with no dish/recipe picked are placeholders, not menu items: drop them before validating/saving. */
export function pruneBlankMenuItems(sections: FormArray): void {
  for (const section of sections.controls) {
    const items = section.get('items') as FormArray
    for (let i = items.length - 1; i >= 0; i--) {
      if (isBlankItem(items.at(i))) items.removeAt(i)
    }
  }
}

/**
 * Plan 496: index of the first empty dish row (no recipeId) in a course, ignoring skipIndex (a row being renamed), else -1.
 * Reads "blank" exactly like pruneBlankMenuItems.
 */
export function blankMenuItemIndex(items: FormArray, skipIndex = -1): number {
  for (let i = 0; i < items.length; i++) {
    if (i !== skipIndex && isBlankItem(items.at(i))) return i
  }
  return -1
}

/**
 * Plan 614: no two menus share a name. A name already taken by another menu gets " (2)", then " (3)"...
 * Compared trimmed; an empty name is the caller's job (see dateMenuName).
 */
export function uniqueMenuName(name: string, otherNames: string[]): string {
  const base = name.trim()
  const taken = new Set(otherNames.map((n) => n.trim()))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base} (${n})`)) n++
  return `${base} (${n})`
}

/** Plan 614: the name of a menu without one — today's date, numbered when another menu already has it. */
export function dateMenuName(existingNames: string[], today: Date = new Date()): string {
  return uniqueMenuName(`${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`, existingNames)
}

/** Hebrew message naming exactly which required fields are missing. */
export function missingMenuFieldsMessage(form: FormGroup, translation: TranslationService): string {
  const t = (key: string) => translation.translate(key)
  const missing: string[] = []
  if (form.get('eventType')?.invalid) missing.push(t('menu_field_event_type'))
  if (form.get('guestCount')?.invalid) missing.push(t('menu_field_guest_count'))
  if (form.get('servingType')?.invalid) missing.push(t('menu_field_serving_type'))
  const sections = (form.get('sections') as FormArray).controls as AbstractControl[]
  if (sections.some((s) => s.get('name')?.invalid)) missing.push(t('menu_field_section_name'))
  const base = t('menu_missing_fields')
  return missing.length ? `${base}: ${missing.join(', ')}` : base
}
