import { Injectable, signal, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { LoggingService } from './logging.service'

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private http = inject(HttpClient)
  private logging = inject(LoggingService)

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
        ...(baseData.section_categories ?? {}),
        ...baseData.allergens,
        ...(baseData.actions ?? {}),
        ...(baseData.preparation_categories ?? {}),
        ...(baseData.export_headers ?? {}),
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

      try {
        localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(finalDict))
      } catch (err) {
        this.logging.warn({ event: 'translation.cache.write_failed', message: 'Dictionary cache write failed (quota or access)', context: { err } })
      }
      this.logging.info({ event: 'translation.dictionary.loaded', message: 'Full hybrid dictionary cached to localStorage' })
    } catch (err) {
      this.logging.error({ event: 'translation.dictionary.load_error', message: 'Dictionary load error', context: { err } })
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
    try {
      localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(cache))
    } catch (err) {
      this.logging.warn({ event: 'translation.cache.write_failed', message: 'Dictionary cache write failed (quota or access)', context: { err } })
    }
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

      try {
        localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(sortedDict))
      } catch (err) {
        this.logging.warn({ event: 'translation.cache.write_failed', message: 'Dictionary cache write failed (quota or access)', context: { err } })
      }
      return sortedDict
    })
    this.logging.info({ event: 'translation.dictionary.updated', message: 'Dictionary entry updated', context: { key: normalizedKey } })
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
      this.logging.warn({ event: 'translation.add.cancelled', message: 'Translation addition cancelled by user' })
      return null
    }

    const sanitizedKey = englishKey.trim().toLowerCase().replace(/\s+/g, '_')
    this.updateInternalDictionaries(sanitizedKey, hebrewLabel)
    this.logging.info({ event: 'translation.entry.created', message: 'Dictionary entry created', context: { key: sanitizedKey } })
    return sanitizedKey
  }


  // --- GETTERS ---
  // getMasterDict() {
  //   return this.masterDict();
  // }
}