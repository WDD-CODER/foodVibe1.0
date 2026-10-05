import { Injectable, signal, computed, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { UserMsgService } from './user-msg.service'
import { LoggingService } from './logging.service'
import { TranslationService } from './translation.service'
import { KeyResolutionService } from './key-resolution.service'
import { TaxonomyStore } from './taxonomy-store.service'
import { Subject } from 'rxjs'

export type RegisterUnitResult =
  { success: true; alreadyInRegistry?: boolean } | { success: false; alreadyOnProduct?: boolean; error?: string }

/** System units: constant, non-removable, values never overwritten. */
export const SYSTEM_UNITS: Readonly<Record<string, number>> = {
  kg: 1000,
  liter: 1000,
  gram: 1,
  ml: 1,
  unit: 1,
  dish: 1,
  tablespoon: 15,
  teaspoon: 5,
  cup: 240,
  pinch: 1,
  portion: 1
}

/**
 * Plan 321 Phase 3 — unit registry as a thin facade over TaxonomyStore (`unit` terms, each
 * carrying its gram-equivalent `gramRate`). SYSTEM_UNITS are always present with their fixed
 * values, whatever the stored terms say.
 */
@Injectable({ providedIn: 'root' })
export class UnitRegistryService {
  private readonly userMsgService = inject(UserMsgService)
  private readonly logging = inject(LoggingService)
  private readonly translationService = inject(TranslationService)
  private readonly keyResolution = inject(KeyResolutionService)
  private readonly taxonomy = inject(TaxonomyStore)

  public readonly unitAdded$ = new Subject<string>()

  /** When opening the unit creator from a product form, pass this product's purchase unit symbols so duplicate names can be rejected in-modal. */
  private unitCreatorContext = signal<{ existingUnitSymbols?: string[] } | null>(null)

  // SIGNALS
  private isCreatorOpen = signal(false)
  public isCreatorOpen_ = this.isCreatorOpen.asReadonly()

  /** Unit key -> gram-equivalent rate: stored units with the system units laid over them. */
  public globalUnits_ = computed<Record<string, number>>(() => {
    const units: Record<string, number> = {}
    for (const t of this.taxonomy.terms('unit')()) units[t.key] = t.gramRate
    return { ...units, ...SYSTEM_UNITS }
  })

  // COMPUTED
  allUnitKeys_ = computed(() => Object.keys(this.globalUnits_()))

  constructor() {
    this.taxonomy.ensureLoaded().catch((err: unknown) => this.logLoadError(err))
  }

  // UI CONTROL
  openUnitCreator(context?: { existingUnitSymbols?: string[] }) {
    this.unitCreatorContext.set(context ?? null)
    this.isCreatorOpen.set(true)
    this.refreshFromStorage()
  }
  closeUnitCreator() {
    this.isCreatorOpen.set(false)
    this.unitCreatorContext.set(null)
  }

  /** Re-load units from storage so dropdowns show the latest (e.g. after add in another tab or previous session). */
  async refreshFromStorage(): Promise<void> {
    await this.taxonomy.reload().catch((err: unknown) => this.logLoadError(err))
  }

  /** Reload from storage after a backup import/restore. */
  reloadFromStorage(): Promise<void> {
    return this.refreshFromStorage()
  }

  // GET
  getConversion(key: string): number {
    return this.globalUnits_()[key] || 1
  }

  /**
   * Registers a new unit.
   * Resolves Hebrew input to canonical key (e.g. "יחידה" -> "unit"); if no match, prompts for English key and adds to dictionary.
   * @param name Display name for the unit (e.g. "צנצנת" or "יחידה")
   * @param rate Amount of basis units that equal 1 of the new unit (e.g. 330 when basis is gram)
   * @param basisUnitKey Key of the reference unit (e.g. "gram"). Rate is stored in gram-equivalent.
   * @returns Result so caller can show in-modal error when unit already exists on product (modal stays open).
   */
  async registerUnit(name: string, rate: number, basisUnitKey?: string): Promise<RegisterUnitResult> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'unit')
    if (!keyToUse) {
      return { success: false, error: (name ?? '').trim() ? 'cancelled_by_user' : 'unit_name_empty' }
    }
    const key = keyToUse.toLowerCase()
    const context = this.unitCreatorContext()

    // 1. Unit already on this product's purchase list (compare by resolved key): reject
    const existingResolved = (context?.existingUnitSymbols ?? []).map(
      (s) => this.translationService.resolveUnit(s ?? '') ?? (s ?? '').trim().toLowerCase()
    )
    if (existingResolved.includes(key)) {
      return { success: false, alreadyOnProduct: true }
    }

    // 2. Unit already in the registry: add to product only; single success message; modal will close
    if (this.globalUnits_()[key]) {
      this.refreshFromStorage()
      this.unitAdded$.next(key)
      this.userMsgService.onSetSuccessMsg('נוספה לרשימת יחידות הרכש של המוצר.')
      return { success: true, alreadyInRegistry: true }
    }

    // 3. Rate in gram-equivalent so getConversion() is consistent across the app
    const factor = basisUnitKey ? this.getConversion(basisUnitKey) : 1
    const gramRate = key in SYSTEM_UNITS ? SYSTEM_UNITS[key] : rate * factor

    try {
      await this.taxonomy.add('unit', key, { gramRate })
      this.unitAdded$.next(key)
      this.userMsgService.onSetSuccessMsg(`היחידה ${key} נוספה בהצלחה`)
      return { success: true }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return { success: false, error: 'unit_save_error' }
      this.userMsgService.onSetErrorMsg(this.taxonomy.errorMessage(err) ?? 'שגיאה בשמירת היחידה במערכת')
      this.logging.error({ event: 'crud.units.save_error', message: 'Unit save error', context: { err } })
      return { success: false, error: 'unit_save_error' }
    }
  }

  /** Deletes a custom unit. System units (kg, liter, gram, ml, unit, dish, ...) cannot be removed. */
  async deleteUnit(unitKey: string): Promise<void> {
    if (unitKey in SYSTEM_UNITS) {
      this.userMsgService.onSetErrorMsg('לא ניתן למחוק יחידות בסיס')
      return
    }
    try {
      if (await this.taxonomy.removeByKey('unit', unitKey))
        this.userMsgService.onSetSuccessMsg(`היחידה ${unitKey} הוסרה`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg(this.taxonomy.errorMessage(err) ?? 'שגיאה במחיקת היחידה מהשרת')
      this.logging.error({ event: 'crud.units.delete_error', message: 'Unit delete error', context: { err } })
    }
  }

  private logLoadError(err: unknown): void {
    this.logging.error({ event: 'crud.units.hydrate_error', message: 'Failed to hydrate units', context: { err } })
  }
}
