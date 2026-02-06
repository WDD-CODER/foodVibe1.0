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

  
}