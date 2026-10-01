import type { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import type { TranslationService } from '@services/translation.service'

/** Rows with no dish/recipe picked are placeholders, not menu items: drop them before validating/saving. */
export function pruneBlankMenuItems(sections: FormArray): void {
  for (const section of sections.controls) {
    const items = section.get('items') as FormArray
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items.at(i).get('recipeId')?.value) items.removeAt(i)
    }
  }
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
