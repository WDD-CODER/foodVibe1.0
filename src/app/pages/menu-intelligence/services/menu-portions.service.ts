import { DestroyRef, Injectable, computed, inject, signal, type Signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import type { FormGroup } from '@angular/forms'
import type { MenuEvent, TypeSnapshot } from '@models/menu-event.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { EventTypeSnapshotService } from '@services/event-type-snapshot.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { computePortions, type ItemPortions } from '../../../core/engine/portions'

type Kind = 'eventType' | 'menuType'
type RawItem = {
  recipeId?: string
  recipeType?: 'dish' | 'preparation'
  serving_portions?: number | null
  coefficient_override?: number | null
}
type RawSection = { _id?: string; items?: RawItem[] }

/**
 * Plan 441 — the menu page's portions, kept out of the (growth-frozen) page file.
 * Provided by the page: one instance per open menu. Everything goes through `computePortions`.
 */
@Injectable()
export class MenuPortionsService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly snapshotService_ = inject(EventTypeSnapshotService)
  private readonly taxonomy_ = inject(TaxonomyStore)
  private readonly destroyRef_ = inject(DestroyRef)

  private readonly form_ = signal<FormGroup | null>(null)
  private readonly version_ = signal<Signal<number> | null>(null)
  /** Snapshots already taken for this menu (loaded from the saved event, or frozen when the chef picked the type). */
  private readonly remembered_ = new Map<Kind, TypeSnapshot>()

  /** Section ids by position, so `at()` does not read the whole form for every dish row. */
  private readonly sectionIds_ = computed(() => {
    this.version_()?.()
    return ((this.form_()?.getRawValue().sections ?? []) as RawSection[]).map((section) => section._id)
  })

  /** Portions of every item of the form, keyed `${section._id}|${itemIndex}` (form positions). */
  readonly byItem = computed(() => {
    this.version_()?.()
    const form = this.form_()
    if (!form) return new Map<string, ItemPortions>()
    return computePortions(this.minimalEvent(form), this.kitchenState_.recipes_())
  })

  /**
   * Connects the menu form; `version` is the page's form-change counter, so `byItem` re-runs on every edit.
   * Snapshots are frozen here, on each form change, so the computed stays free of side effects (call from the page's
   * constructor: the form subscription is registered before the page's own counter bump).
   */
  bind(form: FormGroup, version: Signal<number>): void {
    this.form_.set(form)
    this.version_.set(version)
    this.freeze(form)
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef_)).subscribe(() => this.freeze(form))
  }

  /** Keeps the snapshots of a loaded event: a later change to the type's coefficient must not move it. */
  remember(event: Pick<MenuEvent, 'eventTypeSnapshot' | 'servingTypeSnapshot'>): void {
    this.remembered_.clear()
    if (event.eventTypeSnapshot) this.remembered_.set('eventType', event.eventTypeSnapshot)
    if (event.servingTypeSnapshot) this.remembered_.set('menuType', event.servingTypeSnapshot)
  }

  /** The snapshots to store on the event for the chosen event type and serving type. */
  snapshots(
    eventTypeKey: string,
    servingTypeKey: string
  ): { eventTypeSnapshot?: TypeSnapshot; servingTypeSnapshot?: TypeSnapshot } {
    const eventTypeSnapshot = this.snapshotOf('eventType', eventTypeKey)
    const servingTypeSnapshot = this.snapshotOf('menuType', servingTypeKey)
    return {
      ...(eventTypeSnapshot && { eventTypeSnapshot }),
      ...(servingTypeSnapshot && { servingTypeSnapshot })
    }
  }

  /** Portions, coefficient and override flag of one dish row (null for a row that does not exist). */
  at(sectionIndex: number, itemIndex: number): ItemPortions | null {
    const sectionId = this.sectionIds_()[sectionIndex]
    if (sectionId === undefined) return null
    return this.byItem().get(`${sectionId}|${itemIndex}`) ?? null
  }

  /** Remembers the snapshots of the chosen types (once the terms are loaded); the only writer besides `snapshots`. */
  private freeze(form: FormGroup): void {
    const raw = form.getRawValue() as { eventType?: string; servingType?: string }
    this.snapshots(raw.eventType ?? '', raw.servingType ?? '')
  }

  /** Same snapshot as `snapshotOf` but never remembers it, so it is safe inside a computed. */
  private peekSnapshot(kind: Kind, key: string): TypeSnapshot | undefined {
    return this.snapshotService_.snapshotFor(kind, key, this.remembered_.get(kind))
  }

  private snapshotOf(kind: Kind, key: string): TypeSnapshot | undefined {
    const snapshot = this.snapshotService_.snapshotFor(kind, key, this.remembered_.get(kind))
    // Freeze it once the terms are loaded: a fresh snapshot taken before that would hold a wrong 1.
    if (snapshot && this.taxonomy_.isLoaded_()) this.remembered_.set(kind, snapshot)
    return snapshot
  }

  private peekedSnapshots(
    eventTypeKey: string,
    servingTypeKey: string
  ): { eventTypeSnapshot?: TypeSnapshot; servingTypeSnapshot?: TypeSnapshot } {
    const eventTypeSnapshot = this.peekSnapshot('eventType', eventTypeKey)
    const servingTypeSnapshot = this.peekSnapshot('menuType', servingTypeKey)
    return {
      ...(eventTypeSnapshot && { eventTypeSnapshot }),
      ...(servingTypeSnapshot && { servingTypeSnapshot })
    }
  }

  private minimalEvent(form: FormGroup): MenuEvent {
    const raw = form.getRawValue() as {
      eventType?: string
      servingType?: string
      guestCount?: number
      sections?: RawSection[]
    }
    return {
      _id: '',
      name: '',
      eventType: raw.eventType ?? '',
      servingType: raw.servingType ?? '',
      ...this.peekedSnapshots(raw.eventType ?? '', raw.servingType ?? ''),
      guestCount: Number(raw.guestCount ?? 0),
      sections: (raw.sections ?? []).map((section, sortOrder) => ({
        _id: section._id ?? '',
        name: '',
        sortOrder,
        items: (section.items ?? []).map((item) => {
          const override = Number(item.coefficient_override ?? 0)
          return {
            recipeId: item.recipeId ?? '',
            recipeType: item.recipeType ?? 'dish',
            derivedPortions: 0,
            portionsPerDiner: Number(item.serving_portions ?? 0),
            ...(override > 0 && { coefficientOverride: override })
          }
        })
      }))
    }
  }
}
