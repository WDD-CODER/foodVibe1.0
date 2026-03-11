import { Injectable, signal, computed, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { LoggingService } from './logging.service'
import { Subject } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class UnitRegistryService {
  private readonly userMsgService = inject(UserMsgService)
  private readonly storageService = inject(StorageService)
  private readonly logging = inject(LoggingService)
  private readonly STORAGE_KEY = 'KITCHEN_UNITS'; // Standardized key

  public readonly unitAdded$ = new Subject<string>();

  // SIGNALS
  private isCreatorOpen = signal(false);
  public isCreatorOpen_ = this.isCreatorOpen.asReadonly();

  // Initial defaults - will be overwritten by hydration if storage exists
  public globalUnits_ = signal<Record<string, number>>({
    'kg': 1000,
    'liter': 1000,
    'gram': 1,
    'ml': 1,
    'unit': 1,
    'dish': 1
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
    const DEFAULT_UNITS = { 'kg': 1000, 'liter': 1000, 'gram': 1, 'ml': 1, 'unit': 1, 'dish': 1 };

    try {
      const registries = await this.storageService.query<any>(this.STORAGE_KEY);
      const existingRegistry = registries[0];

      const hasNoUnits = !existingRegistry ||
        !existingRegistry.units ||
        Object.keys(existingRegistry.units).length === 0;

      if (hasNoUnits) {
        if (existingRegistry?._id) {
          await this.storageService.put(this.STORAGE_KEY, {
            ...existingRegistry,
            units: DEFAULT_UNITS
          });
        } else {
          await this.storageService.post(this.STORAGE_KEY, {
            units: DEFAULT_UNITS
          });
        }
        this.globalUnits_.set(DEFAULT_UNITS);
      } else {
        const units = { ...existingRegistry.units };
        if (!('dish' in units)) units['dish'] = 1;
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
  openUnitCreator() {
    this.isCreatorOpen.set(true);
    this.refreshFromStorage();
  }
  closeUnitCreator() { this.isCreatorOpen.set(false); }

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
   * @param name Display name for the unit (e.g. "צנצנת")
   * @param rate Amount of basis units that equal 1 of the new unit (e.g. 330 when basis is gram)
   * @param basisUnitKey Key of the reference unit (e.g. "gram"). Rate is stored in gram-equivalent.
   */
  async registerUnit(name: string, rate: number, basisUnitKey?: string): Promise<void> {
    const sanitizedName = name.trim().toLowerCase();
    const curUnits = this.globalUnits_();

    // 1. Validation Logic
    if (curUnits[sanitizedName]) {
      this.refreshFromStorage(); // Keep dropdown in sync with storage so the existing unit is visible
      return this.userMsgService.onSetErrorMsg(
        'יחידה קיימת בשם הנ"ל. נסה שם ייחודי (למשל: כף שף, צנצנת קטנה)'
      );
    }

    // 2. Rate in gram-equivalent so getConversion() is consistent across the app
    const factor = basisUnitKey ? this.getConversion(basisUnitKey) : 1;
    const rateInGrams = rate * factor;

    // 3. Prepare the updated state
    const updatedUnits = { ...curUnits, [sanitizedName]: rateInGrams };

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
      this.unitAdded$.next(sanitizedName);
      this.userMsgService.onSetSuccessMsg(`היחידה ${sanitizedName} נוספה בהצלחה`);

    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת היחידה במערכת');
      this.logging.error({ event: 'crud.units.save_error', message: 'Unit save error', context: { err } });
      throw err;
    }
  }

  /**
   * Deletes a custom unit from the registry. 
   * Protects base system units from being removed.
   */
  async deleteUnit(unitKey: string): Promise<void> {
    // const protectedUnits = ['kg', 'liter', 'gram', 'ml', 'unit'];
    // if (protectedUnits.includes(unitKey)) {
    //   return this.userMsgService.onSetErrorMsg('לא ניתן למחוק יחידות בסיס');
    // }

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