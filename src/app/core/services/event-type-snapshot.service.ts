import { Injectable, inject } from '@angular/core'
import type { TypeSnapshot } from '@models/menu-event.model'
import { TaxonomyStore } from './taxonomy-store.service'
import { TranslationService } from './translation.service'

/** Plan 441 — freezes an event's type coefficients when the chef picks them, so a later change to the type never moves a saved event. */
@Injectable({ providedIn: 'root' })
export class EventTypeSnapshotService {
  private readonly taxonomy_ = inject(TaxonomyStore)
  private readonly translation_ = inject(TranslationService)

  /**
   * The snapshot for the chosen key: the stored one when it is for the same key (kept as saved),
   * otherwise a fresh `{ key, name, coefficient }` from the current term (no coefficient on the term = 1).
   * No key chosen → undefined.
   */
  snapshotFor(kind: 'eventType' | 'menuType', key: string, stored?: TypeSnapshot): TypeSnapshot | undefined {
    if (!key) return undefined
    if (stored && stored.key === key) return stored
    const coefficient = this.taxonomy_.find(kind, key)?.coefficient ?? 1
    return { key, name: this.translation_.translate(key), coefficient }
  }
}
