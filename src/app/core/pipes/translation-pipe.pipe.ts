// pipes/unit-translate.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'translatePipe',
  standalone: true
})
export class TranslatePipe implements PipeTransform {
  // This dictionary is your single point of truth for translations
  private readonly dictionary: Record<string, string> = {
    // Standard Units
    'kg': 'קילו',
    'liter': 'ליטר',
    'gram': 'גרם',
    'grams': 'גרם',
    'ml': 'מ"ל',
    'unit': 'יחידה',

    // Product category's
    'vegetables': 'ירקות',
    'dairy': 'חלבי',
    'meat': 'בשר',
    'chicken': 'עוף',
    'dry': 'יבשים',
    "fish": 'דגים',

    // New Enum Keys from KitchenUnit
    'bucket': 'דלי',
    'box': 'ארגז',
    'tray': 'תבנית',

    // UI Strings
    'ADD' : 'הוסף',
    'NEW_UNIT': 'יחידה חדשה',
    'NEW_CATEGORY': 'קטגוריה חדשה',
    'PRICE': 'מחיר'
  };

  transform(value: string | null | undefined): string {
    if (!value) return '';
    return this.dictionary[value] || value;
  }
}