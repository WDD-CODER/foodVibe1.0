import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UnitRegistryService {
  // Map of Unit Symbol -> Base Conversion (e.g., 'ק"ג' -> 1000) 
  private globalUnits_ = signal<Record<string, number>>({
    'ק"ג': 1000,
    'ליטר': 1000,
    'גרם': 1,
    'מ"ל': 1,
    'יחידה': 1
  });

  // Exposes all available unit names for your dropdowns
  allUnits_ = computed(() => Object.keys(this.globalUnits_()));

  // Retrieves the conversion rate for a specific unit 
  getConversion(symbol: string): number {
    return this.globalUnits_()[symbol] || 1;
  }

  // Registers a new unit (e.g., 'Box' = 20000g) into the global state 
  registerUnit(symbol: string, rate: number): void {
    this.globalUnits_.update(units => ({ ...units, [symbol]: rate }));
  }
}