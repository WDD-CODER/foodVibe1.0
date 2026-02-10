import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UnitRegistryService {
  private isCreatorOpen = signal(false);
  public isCreatorOpen_ = this.isCreatorOpen.asReadonly();

  /**
   * The Technical Source of Truth (English Keys).
   * Values represent the conversion factor to the lowest common denominator (grams/ml)[cite: 59, 122].
   */
   globalUnits_ = signal<Record<string, number>>({
    'kg': 1,
    'liter': 1,
    'gram': 1,
    'ml': 1,
    'unit': 1
  });


  /**
   * Exposes keys for calculation logic and UI iteration[cite: 65, 410].
   * The UI will pass these keys through TranslatePipe for Hebrew display.
   */
  allUnitKeys_ = computed(() => Object.keys(this.globalUnits_()));

  /**
   * Returns the conversion factor for a given English unit key[cite: 122, 123].
   */
  getConversion(key: string): number {
    return this.globalUnits_()[key] || 1;
  }

  /**
   * Registers a new custom unit. 
   * Standard keys should be English, custom keys (e.g., 'דלי') are stored as-is[cite: 16, 17].
   */
  registerUnit(name: string, rate: number): void {
    this.globalUnits_.update(units => ({ ...units, [name]: rate }));
  }

  openUnitCreator() { this.isCreatorOpen.set(true); }
  closeUnitCreator() { this.isCreatorOpen.set(false); }
}