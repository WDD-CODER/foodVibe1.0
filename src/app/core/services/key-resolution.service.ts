import { Injectable, inject } from '@angular/core';
import { TranslationService } from './translation.service';
import { TranslationKeyModalService, isTranslationKeyResult } from './translation-key-modal.service';

export type KeyResolutionContext =
  | 'category'
  | 'allergen'
  | 'unit'
  | 'supplier'
  | 'generic'
  | 'preparation_category'
  | 'section_category';

const HEBREW_SCRIPT = /[\u0590-\u05FF]/;

@Injectable({ providedIn: 'root' })
export class KeyResolutionService {
  private readonly translation = inject(TranslationService);
  private readonly translationKeyModal = inject(TranslationKeyModalService);

  /**
   * Resolve user input to an English key for key-based fields.
   * If input is Hebrew and has no translation, opens the translation modal.
   * Returns the key to use, or null if cancelled or empty.
   */
  async ensureKeyForContext(value: string, context: KeyResolutionContext): Promise<string | null> {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return null;

    const existingKey = this.resolveForContext(trimmed, context);
    if (existingKey) return existingKey;

    if (!HEBREW_SCRIPT.test(trimmed)) {
      return this.sanitizeAsKey(trimmed);
    }

    const modalContext = this.toModalContext(context);
    const result = await this.translationKeyModal.open(trimmed, modalContext);
    if (!isTranslationKeyResult(result) || !result.englishKey?.trim() || !result.hebrewLabel?.trim()) {
      return null;
    }
    this.translation.addKeyAndHebrew(result.englishKey, result.hebrewLabel);
    return result.englishKey.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private resolveForContext(trimmed: string, context: KeyResolutionContext): string | null {
    switch (context) {
      case 'category':
      case 'supplier':
      case 'generic':
        return this.translation.resolveCategory(trimmed);
      case 'allergen':
        return this.translation.resolveAllergen(trimmed);
      case 'unit':
        return this.translation.resolveUnit(trimmed);
      case 'preparation_category':
        return this.translation.resolvePreparationCategory(trimmed);
      case 'section_category':
        return this.translation.resolveSectionCategory(trimmed);
      default:
        return this.translation.resolveCategory(trimmed);
    }
  }

  private toModalContext(context: KeyResolutionContext): 'category' | 'allergen' | 'supplier' | 'unit' | 'generic' {
    if (context === 'preparation_category' || context === 'section_category') return 'category';
    return context;
  }

  private sanitizeAsKey(input: string): string {
    return input.trim().toLowerCase().replace(/\s+/g, '_');
  }
}
