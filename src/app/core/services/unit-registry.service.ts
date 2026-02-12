import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { UserMsgService } from './user-msg.service';

@Injectable({ providedIn: 'root' })
export class UnitRegistryService {
  // INJECTIONS
  private readonly userMsgService = inject(UserMsgService);
  private readonly storageService = inject(StorageService);
  private readonly STORAGE_KEY = 'KITCHEN_UNITS'; // Standardized key

  // SIGNALS
  private isCreatorOpen = signal(false);
  public isCreatorOpen_ = this.isCreatorOpen.asReadonly();

  // Initial defaults - will be overwritten by hydration if storage exists
  public globalUnits_ = signal<Record<string, number>>({
    'kg': 1000,
    'liter': 1000,
    'gram': 1,
    'ml': 1,
    'unit': 1
  });

  // COMPUTED
  allUnitKeys_ = computed(() => Object.keys(this.globalUnits_()));

  constructor() {
    this.initUnits();
  }

  /**
   * Hydrates the registry from storage or persists defaults if empty.
   */
  private async initUnits(): Promise<void> {
    const DEFAULT_UNITS = { 'kg': 1000, 'liter': 1000, 'gram': 1, 'ml': 1, 'unit': 1 };

    try {
      const registries = await this.storageService.query<any>(this.STORAGE_KEY);
      const existingRegistry = registries[0];

      // בודקים אם המסמך חסר, או אם אובייקט היחידות ריק (ללא מפתחות)
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
        this.globalUnits_.set(existingRegistry.units);
      }
    } catch (err) {
      console.error('Failed to hydrate units:', err);
      this.userMsgService.onSetErrorMsg('שגיאה בטעינת יחידות המידה');
    }
  }

  // UI CONTROL
  openUnitCreator() { this.isCreatorOpen.set(true); }
  closeUnitCreator() { this.isCreatorOpen.set(false); }

  // GET
  getConversion(key: string): number {
    return this.globalUnits_()[key] || 1;
  }

  /**
   * Registers a new unit or updates an existing one using POST/PUT logic.
   */
  async registerUnit(name: string, rate: number): Promise<void> {
    const sanitizedName = name.trim().toLowerCase();
    const curUnits = this.globalUnits_();

    // 1. Validation Logic
    if (curUnits[sanitizedName]) {
      return this.userMsgService.onSetErrorMsg('יחידה קיימת בשם הנ"ל - נסה שוב');
    }

    // 2. Prepare the updated state
    const updatedUnits = { ...curUnits, [sanitizedName]: rate };

    try {
      // 3. Persistence Logic (POST vs PUT)
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

      // 4. Update the Signal for UI reactivity
      this.globalUnits_.set(updatedUnits);
      this.userMsgService.onSetSuccessMsg(`היחידה ${sanitizedName} נוספה בהצלחה`);

    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת היחידה במערכת');
      console.error(err);
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
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת היחידה מהשרת');
      console.error(err);
    }
  }
}