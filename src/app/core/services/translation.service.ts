import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
// Ensure these imports match your actual file paths

@Injectable({ providedIn: 'root' })
export class TranslationService {
  // --- INJECTIONS ---
  private http = inject(HttpClient);

  // --- SIGNALS ---
  private masterDict = signal<Record<string, string>>({});

  constructor() {
    this.loadGlobalDictionary();
  }

  //LIST
  public async loadGlobalDictionary(): Promise<void> {
    try {
      const jsonPath = '/assets/data/dictionary.json';
      const baseData = await firstValueFrom(this.http.get<any>(jsonPath));

      const baseFlattened = {
        ...baseData.units,
        ...baseData.categories,
        ...baseData.allergens,
        ...(baseData.actions ?? {}),
        ...baseData.general
      };

      const localData = localStorage.getItem('DICTIONARY_CACHE');
      const existingCache = localData ? JSON.parse(localData) : {};

      const finalDict = { ...baseFlattened, ...existingCache };

      const sortedFinalDict = Object.keys(finalDict)
        .sort()
        .reduce((acc, k) => {
          acc[k] = finalDict[k];
          return acc;
        }, {} as Record<string, string>);

      this.masterDict.set(finalDict);

      localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(finalDict));

      console.log('✅ Full Hybrid Dictionary Cached to LocalStorage');
    } catch (err) {
      console.error('❌ Dictionary Load Error:', err);
    }
  }

  //UPDATE

  private updateInternalDictionaries(key: string, label: string): void {
    const normalizedKey = key.trim().toLowerCase();

    this.masterDict.update(prev => ({
      ...prev,
      [normalizedKey]: label.trim()
    }));

    const rawCache = localStorage.getItem('DICTIONARY_CACHE');
    const cache = rawCache ? JSON.parse(rawCache) : {};
    cache[normalizedKey] = label.trim();
    localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(cache));
  }

  updateDictionary(key: string, label: string): void {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    const sanitizedLabel = label.trim();

    this.masterDict.update(prev => {
      const newDict = { ...prev, [normalizedKey]: sanitizedLabel };

      const sortedDict = Object.keys(newDict)
        .sort()
        .reduce((acc, k) => {
          acc[k] = newDict[k];
          return acc;
        }, {} as Record<string, string>);

      localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(sortedDict));
      return sortedDict;
    });
    console.log(`%c 📖 Dictionary Updated: "${normalizedKey}": "${sanitizedLabel}"`, 'color: #4CAF50; font-weight: bold;');
  }

  translate(key: string | undefined): string {
    if (!key) return '';
    const normalizedKey = key.trim().toLowerCase();
    const translation = this.masterDict()[normalizedKey];

    return translation || key;
  }

  // --- PRIVATE HELPERS ---

  validateEnglishKey(key: string): { valid: boolean; error?: string } {
    const sanitized = key.trim().toLowerCase().replace(/\s+/g, '_');
    const englishRegex = /^[a-z0-9_]+$/;

    if (!englishRegex.test(sanitized)) {
      return { valid: false, error: 'Translation must contain only letters, numbers, and underscores.' };
    }

    if (this.masterDict()[sanitized]) {
      const existing = this.masterDict()[sanitized];
      return { valid: false, error: `The ID "${sanitized}" is already used for "${existing}".` };
    }

    return { valid: true };
  }

  isHebrewLabelDuplicate(label: string): boolean {
    const sanitized = label.trim();
    return Object.values(this.masterDict()).includes(sanitized);
  }

  private async proposeAndSaveTranslation(hebrewLabel: string): Promise<string | null> {
    const englishKey = prompt(`Enter English ID for "${hebrewLabel}" (e.g., olive_oil):`);

    if (!englishKey || !englishKey.trim()) {
      console.warn('Translation addition cancelled by user.');
      return null;
    }

    const sanitizedKey = englishKey.trim().toLowerCase().replace(/\s+/g, '_');

    this.updateInternalDictionaries(sanitizedKey, hebrewLabel);

    console.log(`%c ✅ Dictionary Entry Created: "${sanitizedKey}": "${hebrewLabel}"`, 'color: green; font-weight: bold');

    return sanitizedKey;
  }


  // --- GETTERS ---
  // getMasterDict() {
  //   return this.masterDict();
  // }
}