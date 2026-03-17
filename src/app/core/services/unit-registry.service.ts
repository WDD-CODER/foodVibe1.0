import { Injectable, signal, computed, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { LoggingService } from './logging.service'
import { TranslationService } from './translation.service'
import { KeyResolutionService } from './key-resolution.service'
import { Subject } from 'rxjs'

export type RegisterUnitResult =
  | { success: true; alreadyInRegistry?: boolean }
  | { success: false; alreadyOnProduct?: boolean; error?: string };

/** System units: constant, non-removable, values never overwritten. */
export const SYSTEM_UNITS: Readonly<Record<string, number>> = {
  kg: 1000,
  liter: 1000,
  gram: 1,
  ml: 1,
  unit: 1,
  dish: 1
};

@Injectable({ providedIn: 'root' })
export class UnitRegistryService {
  private readonly userMsgService = inject(UserMsgService)
  private readonly storageService = inject(StorageService)
  private readonly logging = inject(LoggingService)
  private readonly translationService = inject(TranslationService)
  private readonly keyResolution = inject(KeyResolutionService)
  private readonly STORAGE_KEY = 'KITCHEN_UNITS'; // Standardized key

  public readonly unitAdded$ = new Subject<string>();

  /** When opening the unit creator from a product form, pass this product's purchase unit symbols so duplicate names can be rejected in-modal. */
  private unitCreatorContext = signal<{ existingUnitSymbols?: string[] } | null>(null);

  // SIGNALS
  private isCreatorOpen = signal(false);
  public isCreatorOpen_ = this.isCreatorOpen.asReadonly();

  // Initial defaults - will be overwritten by hydration if storage exists
  public globalUnits_ = signal<Record<string, number>>({
    ...SYSTEM_UNITS
  });

  // COMPUTED
  allUnitKeys_ = computed(() => Object.keys(this.globalUnits_()));

  constructor() {
    this.initUnits();
  }

  /**
   * Hydrates the registry from storage or persists defaults if empty.
   * @param skipOverwriteIfNewer When true (e.g. initial load), do not replace in-memory state if it has more units than storage (avoids race where user added a unit before hydration completed).
   */
  private async initUnits(skipOverwriteIfNewer = true): Promise<void> {
    try {
      const registries = await this.storageService.query<any>(this.STORAGE_KEY);
      const existingRegistry = registries[0];

      const hasNoUnits = !existingRegistry ||
        !existingRegistry.units ||
        Object.keys(existingRegistry.units).length === 0;

      if (hasNoUnits) {
        const defaultUnits = { ...SYSTEM_UNITS };
        if (existingRegistry?._id) {
          await this.storageService.put(this.STORAGE_KEY, {
            ...existingRegistry,
            units: defaultUnits
          });
        } else {
          await this.storageService.post(this.STORAGE_KEY, {
            units: defaultUnits
          });
        }
        this.globalUnits_.set(defaultUnits);
      } else {
        const units = { ...existingRegistry.units };
        // Merge system units over storage so their values are never overwritten
        Object.keys(SYSTEM_UNITS).forEach(k => { units[k] = SYSTEM_UNITS[k]; });
        if (skipOverwriteIfNewer) {
          const currentKeys = Object.keys(this.globalUnits_());
          if (currentKeys.length > Object.keys(units).length) return;
        }
        this.globalUnits_.set(units);
      }
    } catch (err) {
      this.logging.error({ event: 'crud.units.hydrate_error', message: 'Failed to hydrate units', context: { err } })
      this.userMsgService.onSetErrorMsg('שגיאה בטעינת יחידות המידה')
    }
  }

  // UI CONTROL
  openUnitCreator(context?: { existingUnitSymbols?: string[] }) {
    this.unitCreatorContext.set(context ?? null);
    this.isCreatorOpen.set(true);
    this.refreshFromStorage();
  }
  closeUnitCreator() {
    this.isCreatorOpen.set(false);
    this.unitCreatorContext.set(null);
  }

  /** Re-load units from storage so dropdowns show the latest (e.g. after add in another tab or previous session). */
  async refreshFromStorage(): Promise<void> {
    await this.initUnits(false);
  }

  // GET
  getConversion(key: string): number {
    return this.globalUnits_()[key] || 1;
  }

  /**
   * Registers a new unit or updates an existing one using POST/PUT logic.
   * Resolves Hebrew input to canonical key (e.g. "יחידה" -> "unit"); if no match, prompts for English key and adds to dictionary.
   * @param name Display name for the unit (e.g. "צנצנת" or "יחידה")
   * @param rate Amount of basis units that equal 1 of the new unit (e.g. 330 when basis is gram)
   * @param basisUnitKey Key of the reference unit (e.g. "gram"). Rate is stored in gram-equivalent.
   * @returns Result so caller can show in-modal error when unit already exists on product (modal stays open).
   */
  async registerUnit(name: string, rate: number, basisUnitKey?: string): Promise<RegisterUnitResult> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'unit');
    if (!keyToUse) {
      return { success: false, error: (name ?? '').trim() ? 'cancelled_by_user' : 'unit_name_empty' };
    }
    const key = keyToUse.toLowerCase();
    const curUnits = this.globalUnits_();
    const context = this.unitCreatorContext();

    // 1. Unit already on this product's purchase list (compare by resolved key): reject
    const existingResolved = (context?.existingUnitSymbols ?? []).map((s) =>
      this.translationService.resolveUnit(s ?? '') ?? (s ?? '').trim().toLowerCase()
    );
    if (existingResolved.includes(key)) {
      return { success: false, alreadyOnProduct: true };
    }

    // 2. Unit already in global registry: add to product only; single success message; modal will close
    if (curUnits[key]) {
      this.refreshFromStorage();
      this.unitAdded$.next(key);
      this.userMsgService.onSetSuccessMsg('נוספה לרשימת יחידות הרכש של המוצר.');
      return { success: true, alreadyInRegistry: true };
    }

    // 3. Rate in gram-equivalent so getConversion() is consistent across the app
    const factor = basisUnitKey ? this.getConversion(basisUnitKey) : 1;
    const rateInGrams = rate * factor;
    // System units: never overwrite with a different value
    const valueToStore = key in SYSTEM_UNITS ? SYSTEM_UNITS[key] : rateInGrams;

    // 4. Prepare the updated state
    const updatedUnits = { ...curUnits, [key]: valueToStore };

    try {
      // 4. Persistence Logic (POST vs PUT)
      // We treat the entire unit collection as one registry document
      const registries = await this.storageService.query<any>(this.STORAGE_KEY);
      const existingRegistry = registries[0];

      if (existingRegistry && existingRegistry._id) {
        // It exists -> Update the document (PUT)
        await this.storageService.put(this.STORAGE_KEY, {
          ...existingRegistry,
          units: updatedUnits
        });
      } else {
        // Doesn't exist -> Create new document (POST)
        await this.storageService.post(this.STORAGE_KEY, {
          units: updatedUnits
        });
      }

      // 5. Update the Signal for UI reactivity
      this.globalUnits_.set(updatedUnits);
      this.unitAdded$.next(key);
      this.userMsgService.onSetSuccessMsg(`היחידה ${key} נוספה בהצלחה`);
      return { success: true };
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת היחידה במערכת');
      this.logging.error({ event: 'crud.units.save_error', message: 'Unit save error', context: { err } });
      return { success: false, error: 'unit_save_error' };
    }
  }

  /**
   * Deletes a custom unit from the registry.
   * System units (kg, liter, gram, ml, unit, dish) cannot be removed.
   */
  async deleteUnit(unitKey: string): Promise<void> {
    if (unitKey in SYSTEM_UNITS) {
      this.userMsgService.onSetErrorMsg('לא ניתן למחוק יחידות בסיס');
      return;
    }

    const updatedUnits = { ...this.globalUnits_() };
    delete updatedUnits[unitKey];

    try {
      const registries = await this.storageService.query<any>(this.STORAGE_KEY);
      const registry = registries[0];

      if (registry?._id) {
        await this.storageService.put(this.STORAGE_KEY, {
          ...registry,
          units: updatedUnits
        });
        this.globalUnits_.set(updatedUnits);
        this.userMsgService.onSetSuccessMsg(`היחידה ${unitKey} הוסרה`);
      }
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת היחידה מהשרת')
      this.logging.error({ event: 'crud.units.delete_error', message: 'Unit delete error', context: { err } })
    }
  }
}