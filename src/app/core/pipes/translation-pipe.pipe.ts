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
  'grams': 'גרם',
  'ml': 'מ"ל',
  'unit': 'יחידה',
  
  // New Enum Keys from KitchenUnit
  'bucket': 'דלי',
  'box': 'ארגז',
  'tray': 'תבנית',

  // UI Strings
  'NEW_UNIT': '+ הוסף יחידה חדשה',
  'PRICE': 'מחיר'
};

  transform(value: string | null | undefined): string {
    if (!value) return '';
    // If it's in our dictionary, translate it. 
    // If it's a custom unit (like "דלי"), return the name as is.
    return this.dictionary[value] || value;
  }
}