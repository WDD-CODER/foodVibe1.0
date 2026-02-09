import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConversionService {

  /**
   * Calculates the Net Cost per base unit (gram/ml)
   * Formula: Gross Price / (Total Quantity * Yield Factor)
   */
  calculateNetCost(grossPrice: number, convFactor: number, wastePercent: number): number {
    if (!grossPrice || convFactor <= 0) return 0;
    const yieldFactor = 1 - (wastePercent / 100);
    const netQuantity = convFactor * yieldFactor;
    return netQuantity > 0 ? grossPrice / netQuantity : 0;
  }



  /**
   * Translates waste percentage to quantity based on total scaling amount
   */
  getWasteQuantity(percent: number, total: number): number {
    return (percent / 100) * total;
  }

  /**
   * Translates waste quantity to percentage based on total scaling amount
   */
  getWastePercent(quantity: number, total: number): number {
    return total > 0 ? (quantity / total) * 100 : 0;
  }

  /**
   * Calculates scaling chain logic (e.g., 1 Case = 6 Buckets)
   */
  getChainConversion(amount: number, factor: number): number {
    return amount * factor;
  }

  /** * Logic to sync Waste % and Yield Factor 
   */
  handleWasteChange(wastePercent: any): { yieldFactor: number } {
    // Guard against non-numeric or empty values while typing 
    if (wastePercent === null || wastePercent === '') {
    return { yieldFactor: 1 };
  }
    const val = parseFloat(wastePercent);
    if (isNaN(val)) return { yieldFactor: 1 };

    const yieldFactor = Math.max(0, (100 - val) / 100);
    return { yieldFactor: parseFloat(yieldFactor.toFixed(4)) }; // Avoid floating point junk 
  }

  handleYieldChange(yieldFactor: any): { wastePercent: number } {
    const val = parseFloat(yieldFactor);
    if (isNaN(val)) return { wastePercent: 0 };

    const wastePercent = Math.max(0, 100 - (val * 100));
    return { wastePercent: Math.round(wastePercent) };
  }

  /**
   * Calculates suggested price for a purchase unit based on global price and conversion rate
   */
  getSuggestedPurchasePrice(globalPrice: number, conversionRate: number): number {
    if (!globalPrice || !conversionRate) return 0;
    return globalPrice * conversionRate;
  }
}