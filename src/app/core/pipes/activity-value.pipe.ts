import { Pipe, PipeTransform, inject } from '@angular/core'
import { TranslationService } from '../services/translation.service'
import { KitchenStateService } from '../services/kitchen-state.service'

/** Fields whose recorded value is free text (or already formatted) — shown as-is, never split or translated. */
const RAW_FIELDS = new Set(['name', 'price'])

/**
 * Formats one side (old or new) of a recorded activity change for display (plan 351):
 * - `supplier`: comma-separated supplier ids → supplier names (unknown id → "deleted supplier").
 * - `name` / `price`: shown as recorded.
 * - anything else: comma-separated canonical keys → translated labels.
 * - empty → "—".
 *
 * Impure on purpose (like `translatePipe`): the dictionary and the supplier list load
 * asynchronously, and resolving at render time is what lets entries recorded before this
 * change show names instead of ids.
 */
@Pipe({
  name: 'activityValue',
  standalone: true,
  pure: false
})
export class ActivityValuePipe implements PipeTransform {
  private readonly translation = inject(TranslationService)
  private readonly kitchenState = inject(KitchenStateService)

  transform(value: string | null | undefined, field: string): string {
    if (value == null || value.trim() === '') return '—'
    if (RAW_FIELDS.has(field)) return value

    const tokens = value.split(',').map((s) => s.trim()).filter(Boolean)
    if (tokens.length === 0) return '—'

    if (field === 'supplier') {
      const byId = this.kitchenState.suppliersById_()
      return tokens
        .map((id) => byId.get(id)?.nameHebrew ?? this.translation.translate('activity_deleted_supplier'))
        .join(', ')
    }

    return tokens.map((t) => this.translation.translate(t)).join(', ')
  }
}
